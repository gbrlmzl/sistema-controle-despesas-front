import responderSolicitacaoAction from "./responderSolicitacaoAction";
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

describe("responderSolicitacaoAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await responderSolicitacaoAction("AB12CD", 10, true);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("ao aceitar, envia status accepted e devolve a mensagem de membro novo", async () => {
        mockApiFetch.mockResolvedValue({ requesterName: "Bruno", accepted: true });

        const resultado = await responderSolicitacaoAction("AB12CD", 10, true);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/join-requests/10", {
            method: "PATCH",
            body: { status: "accepted" },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD");
        expect(resultado).toEqual({ success: true, message: "Bruno agora é membro da residência." });
    });

    it("ao recusar, envia status declined e devolve a mensagem de recusa", async () => {
        mockApiFetch.mockResolvedValue({ requesterName: "Bruno", accepted: false });

        const resultado = await responderSolicitacaoAction("AB12CD", 10, false);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/join-requests/10", {
            method: "PATCH",
            body: { status: "declined" },
        });
        expect(resultado).toEqual({ success: true, message: "Solicitação de Bruno recusada." });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o proprietário pode responder solicitações"));

        const resultado = await responderSolicitacaoAction("AB12CD", 10, true);

        expect(resultado).toEqual({ success: false, message: "Só o proprietário pode responder solicitações" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await responderSolicitacaoAction("AB12CD", 10, true);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao responder a solicitação. Tente novamente mais tarde.",
        });
    });
});
