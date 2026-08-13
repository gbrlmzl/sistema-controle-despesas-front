import editarDespesaAction from "./editarDespesaAction";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { AuthUser } from "@/types/auth";

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

describe("editarDespesaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o valor digitado é inválido", async () => {
        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "Mercado",
            value: "abc",
            category: "ALIMENTACAO",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe um valor válido, como 180,50" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna a primeira mensagem de erro do Zod quando a validação falha", async () => {
        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "A",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "O nome da despesa deve ter no mínimo 2 caracteres",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia PATCH com o payload convertido e revalida as duas rotas", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
            isRecurring: "on",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/99", {
            method: "PATCH",
            body: {
                name: "Mercado",
                valueInCents: 18050,
                category: "ALIMENTACAO",
                isRecurring: true,
            },
        });

        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses/recurring");
        expect(resultado).toEqual({ success: true, message: "Despesa atualizada!" });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o autor pode editar esta despesa"));

        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Só o autor pode editar esta despesa" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({
            code: "AB12CD",
            expenseId: "99",
            name: "Mercado",
            value: "180,50",
            category: "ALIMENTACAO",
        });

        const resultado = await editarDespesaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao atualizar a despesa. Tente novamente mais tarde.",
        });
    });
});
