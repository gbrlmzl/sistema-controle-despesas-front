import reabrirMesAction from "./reabrirMesAction";
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

describe("reabrirMesAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await reabrirMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, monta o período com mês zero-padded, revalida e devolve a mensagem", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const resultado = await reabrirMesAction("AB12CD", 7, 2026);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/month-closures/2026-07", {
            method: "DELETE",
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/expenses");
        expect(resultado).toEqual({ success: true, message: "Mês de Julho de 2026 reaberto." });
    });

    it("mantém o mês zero-padded mesmo para meses de dois dígitos", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        await reabrirMesAction("AB12CD", 12, 2026);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/month-closures/2026-12", {
            method: "DELETE",
        });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(409, "Apenas o fechamento mais recente pode ser reaberto"));

        const resultado = await reabrirMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({
            success: false,
            message: "Apenas o fechamento mais recente pode ser reaberto",
        });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await reabrirMesAction("AB12CD", 7, 2026);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao reabrir o mês. Tente novamente mais tarde.",
        });
    });
});
