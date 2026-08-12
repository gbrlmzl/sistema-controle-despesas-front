import convidarUsuarioAction from "./convidarUsuarioAction";
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

describe("convidarUsuarioAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({ code: "AB12CD", username: "bruno" });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o campo username nem está presente no FormData", async () => {
        const formData = criarFormData({ code: "AB12CD" });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o nome de usuário" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o nome de usuário não é informado", async () => {
        const formData = criarFormData({ code: "AB12CD", username: "" });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o nome de usuário" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o nome de usuário é só espaços", async () => {
        const formData = criarFormData({ code: "AB12CD", username: "   " });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o nome de usuário" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("normaliza o username (trim + minúsculas) antes de enviar", async () => {
        mockApiFetch.mockResolvedValue({ invitedUserName: "Bruno" });

        const formData = criarFormData({ code: "AB12CD", username: "  BRUNO  " });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/invites", {
            method: "POST",
            body: { username: "bruno" },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD");
        expect(resultado).toEqual({ success: true, message: "Convite enviado para Bruno!" });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(404, "Usuário não encontrado"));

        const formData = criarFormData({ code: "AB12CD", username: "bruno" });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não encontrado" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({ code: "AB12CD", username: "bruno" });

        const resultado = await convidarUsuarioAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao enviar o convite. Tente novamente mais tarde.",
        });
    });
});
