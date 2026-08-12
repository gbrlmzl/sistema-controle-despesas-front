import entrarResidenciaAction from "./entrarResidenciaAction";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { getCurrentUser } from "@/lib/session";
import type { AuthUser } from "@/types/auth";

jest.mock("@/lib/apiClient", () => ({
    apiFetch: jest.fn(),
    ApiError: jest.requireActual("@/lib/apiError").ApiError,
}));
jest.mock("@/lib/session", () => ({ getCurrentUser: jest.fn() }));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

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
    mockGetCurrentUser.mockResolvedValue(USUARIO_LOGADO);
});

describe("entrarResidenciaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({ code: "AB12CD" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o código não é informado", async () => {
        const formData = criarFormData({ code: "" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o código da residência" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna a mensagem genérica de não encontrada quando o código tem formato inválido", async () => {
        const formData = criarFormData({ code: "abc" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Nenhuma residência foi encontrada com esse código",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("normaliza o código (trim + maiúsculas) antes de validar e enviar", async () => {
        mockApiFetch.mockResolvedValue({ residenceName: "Casa da Praia" });

        const formData = criarFormData({ code: "  ab12cd  " });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/join-requests", {
            method: "POST",
            body: { code: "AB12CD" },
        });
        expect(resultado).toEqual({
            success: true,
            message: 'Solicitação enviada! Aguarde a resposta do criador da residência "Casa da Praia".',
        });
    });

    it("converte um ApiError 404 na mensagem genérica de não encontrada (RN-050)", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(404, "Residência não existe"));

        const formData = criarFormData({ code: "AB12CD" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Nenhuma residência foi encontrada com esse código",
        });
    });

    it("repassa a mensagem da API para outros status de ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(429, "Muitas tentativas, aguarde um pouco"));

        const formData = criarFormData({ code: "AB12CD" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Muitas tentativas, aguarde um pouco" });
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({ code: "AB12CD" });

        const resultado = await entrarResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao enviar a solicitação. Tente novamente mais tarde.",
        });
    });
});
