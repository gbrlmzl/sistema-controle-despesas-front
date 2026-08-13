import cadastrarDespesaAction from "./cadastrarDespesaAction";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { AuthUser } from "@/types/auth";

//Factory explícita: apiClient.ts e session.ts importam next/headers/next/cache,
//que só existem no runtime de servidor do Next.js e quebrariam em jsdom se o
//módulo real fosse carregado (mesmo padrão usado em expensesApi.test.ts).
jest.mock("@/lib/apiClient", () => ({
    apiFetch: jest.fn(),
    ApiError: jest.requireActual("@/lib/apiError").ApiError,
}));
jest.mock("@/lib/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const USUARIO_LOGADO: AuthUser = {
    id: 1,
    name: "Ana",
    username: "ana",
    email: "ana@example.com",
    profilePic: null,
};

function criarFormData(campos: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [chave, valor] of Object.entries(campos)) {
        formData.set(chave, valor);
    }
    return formData;
}

beforeEach(() => {
    mockApiFetch.mockReset();
    mockGetCurrentUser.mockReset();
    mockRevalidatePath.mockReset();
    mockGetCurrentUser.mockResolvedValue(USUARIO_LOGADO);
});

describe("cadastrarDespesaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro e não chama a API quando o valor digitado é inválido", async () => {
        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "18o,50",
            category: "ALIMENTACAO",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe um valor válido, como 180,50" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna a primeira mensagem de erro do Zod quando a validação falha", async () => {
        const formData = criarFormData({
            code: "AB12CD",
            name: "A",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "O nome da despesa deve ter no mínimo 2 caracteres",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("rejeita categoria fora do enum", async () => {
        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "180,50",
            category: "VIAGEM",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Selecione uma categoria" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia o payload convertido, revalida as duas rotas e monta a mensagem com a competência", async () => {
        mockApiFetch.mockResolvedValue({ expense: { month: 7, year: 2026 } });

        const formData = criarFormData({
            code: "AB12CD",
            name: "  Mercado  ",
            value: "R$ 180,50",
            category: "ALIMENTACAO",
            isRecurring: "on",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses", {
            method: "POST",
            body: {
                name: "Mercado",
                valueInCents: 18050,
                category: "ALIMENTACAO",
                isRecurring: true,
            },
        });

        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses/recurring");
        expect(mockRevalidatePath).toHaveBeenCalledTimes(2);

        expect(resultado).toEqual({ success: true, message: "Despesa lançada em Julho de 2026!" });
    });

    it("isRecurring não marcado (checkbox ausente do FormData) é enviado como false", async () => {
        mockApiFetch.mockResolvedValue({ expense: { month: 1, year: 2027 } });

        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "10,00",
            category: "OUTROS",
        });

        await cadastrarDespesaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses", expect.objectContaining({
            body: expect.objectContaining({ isRecurring: false }),
        }));
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Residência arquivada"));

        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Residência arquivada" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({
            code: "AB12CD",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await cadastrarDespesaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao cadastrar a despesa. Tente novamente mais tarde.",
        });
    });
});
