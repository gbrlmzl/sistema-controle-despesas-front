import responderConviteAction from "./responderConviteAction";
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

describe("responderConviteAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await responderConviteAction(7, true);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("ao aceitar e entrar, envia status accepted e devolve a mensagem de entrada", async () => {
        mockApiFetch.mockResolvedValue({ residenceName: "Casa da Praia", joined: true });

        const resultado = await responderConviteAction(7, true);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/invites/7", {
            method: "PATCH",
            body: { status: "accepted" },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/app/residences");
        expect(resultado).toEqual({ success: true, message: 'Você entrou na residência "Casa da Praia"!' });
    });

    it("ao recusar, envia status declined e devolve a mensagem de recusa", async () => {
        mockApiFetch.mockResolvedValue({ residenceName: "Casa da Praia", joined: false });

        const resultado = await responderConviteAction(7, false);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/invites/7", {
            method: "PATCH",
            body: { status: "declined" },
        });
        expect(resultado).toEqual({ success: true, message: "Convite recusado." });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(410, "Este convite não está mais disponível"));

        const resultado = await responderConviteAction(7, true);

        expect(resultado).toEqual({ success: false, message: "Este convite não está mais disponível" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await responderConviteAction(7, true);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao responder o convite. Tente novamente mais tarde.",
        });
    });
});
