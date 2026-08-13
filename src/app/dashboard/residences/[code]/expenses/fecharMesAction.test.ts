import fecharMesAction from "./fecharMesAction";
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

beforeEach(() => {
    mockApiFetch.mockReset();
    mockGetCurrentUser.mockReset();
    mockRevalidatePath.mockReset();
    mockGetCurrentUser.mockResolvedValue(USUARIO_LOGADO);
});

describe("fecharMesAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await fecharMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso sem recorrências geradas, monta a mensagem sem complemento", async () => {
        mockApiFetch.mockResolvedValue({
            closure: { month: 7, year: 2026 },
            recurringExpensesGenerated: 0,
        });

        const resultado = await fecharMesAction("AB12CD", 7, 2026);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/month-closures", {
            method: "POST",
            body: { month: 7, year: 2026 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses");
        expect(resultado).toEqual({ success: true, message: "Mês de Julho de 2026 fechado." });
    });

    it("em sucesso com recorrências geradas, complementa a mensagem com a competência seguinte", async () => {
        mockApiFetch.mockResolvedValue({
            closure: { month: 7, year: 2026 },
            recurringExpensesGenerated: 3,
        });

        const resultado = await fecharMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({
            success: true,
            message: "Mês de Julho de 2026 fechado. 3 despesa(s) recorrente(s) foram lançadas em Agosto de 2026.",
        });
    });

    it("vira o ano ao gerar recorrências no fechamento de dezembro", async () => {
        mockApiFetch.mockResolvedValue({
            closure: { month: 12, year: 2026 },
            recurringExpensesGenerated: 1,
        });

        const resultado = await fecharMesAction("AB12CD", 12, 2026);

        expect(resultado).toEqual({
            success: true,
            message: "Mês de Dezembro de 2026 fechado. 1 despesa(s) recorrente(s) foram lançadas em Janeiro de 2027.",
        });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o proprietário pode fechar o mês"));

        const resultado = await fecharMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({ success: false, message: "Só o proprietário pode fechar o mês" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await fecharMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao fechar o mês. Tente novamente mais tarde.",
        });
    });
});
