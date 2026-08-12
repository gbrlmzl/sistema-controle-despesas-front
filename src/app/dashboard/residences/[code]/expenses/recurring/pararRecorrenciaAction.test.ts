import pararRecorrenciaAction from "./pararRecorrenciaAction";
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

describe("pararRecorrenciaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await pararRecorrenciaAction("AB12CD", "99");

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia DELETE na rota de recorrência e revalida as duas rotas", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const resultado = await pararRecorrenciaAction("AB12CD", "99");

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/99/recurrence", {
            method: "DELETE",
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses/recurring");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses");
        expect(resultado).toEqual({
            success: true,
            message: "A despesa não será mais repetida automaticamente.",
        });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o autor pode alterar esta despesa"));

        const resultado = await pararRecorrenciaAction("AB12CD", "99");

        expect(resultado).toEqual({ success: false, message: "Só o autor pode alterar esta despesa" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await pararRecorrenciaAction("AB12CD", "99");

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao atualizar a despesa. Tente novamente mais tarde.",
        });
    });
});
