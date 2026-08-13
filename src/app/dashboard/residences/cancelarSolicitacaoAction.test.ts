import cancelarSolicitacaoAction from "./cancelarSolicitacaoAction";
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

describe("cancelarSolicitacaoAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await cancelarSolicitacaoAction(10);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia DELETE e devolve a mensagem com o nome da residência", async () => {
        mockApiFetch.mockResolvedValue({ residenceName: "Casa da Praia" });

        const resultado = await cancelarSolicitacaoAction(10);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/join-requests/10", { method: "DELETE" });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/app/residences");
        expect(resultado).toEqual({ success: true, message: 'Solicitação para "Casa da Praia" cancelada.' });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(409, "A solicitação já foi respondida"));

        const resultado = await cancelarSolicitacaoAction(10);

        expect(resultado).toEqual({ success: false, message: "A solicitação já foi respondida" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await cancelarSolicitacaoAction(10);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao cancelar a solicitação. Tente novamente mais tarde.",
        });
    });
});
