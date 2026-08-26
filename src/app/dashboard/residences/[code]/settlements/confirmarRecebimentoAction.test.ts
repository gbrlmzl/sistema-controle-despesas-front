import confirmarRecebimentoAction from "./confirmarRecebimentoAction";
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
    id: 3,
    name: "Gabriel Mizael",
    username: "gabriel",
    email: "gabriel@example.com",
    profilePic: null,
};

beforeEach(() => {
    mockApiFetch.mockReset();
    mockGetCurrentUser.mockReset();
    mockRevalidatePath.mockReset();
    mockGetCurrentUser.mockResolvedValue(USUARIO_LOGADO);
});

describe("confirmarRecebimentoAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await confirmarRecebimentoAction("AB12CD", 8, 2026, "s1");

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("chama a rota /confirm com o :period no formato AAAA-MM, sem corpo", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        await confirmarRecebimentoAction("AB12CD", 8, 2026, "s1");

        expect(mockApiFetch).toHaveBeenCalledWith(
            "/residences/AB12CD/closures/2026-08/settlements/s1/confirm",
            { method: "POST" },
        );
    });

    it("em sucesso, revalida a tela de acertos e devolve a mensagem de confirmação", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const resultado = await confirmarRecebimentoAction("AB12CD", 8, 2026, "s1");

        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/settlements");
        expect(resultado).toEqual({ success: true, message: "Recebimento confirmado." });
    });

    it("repassa a mensagem da API quando ela responde com ApiError (ex.: 409 -- linha já liquidada)", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(409, "Este acerto já foi liquidado"));

        const resultado = await confirmarRecebimentoAction("AB12CD", 8, 2026, "s1");

        expect(resultado).toEqual({ success: false, message: "Este acerto já foi liquidado" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await confirmarRecebimentoAction("AB12CD", 8, 2026, "s1");

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao confirmar o recebimento. Tente novamente mais tarde.",
        });
    });
});
