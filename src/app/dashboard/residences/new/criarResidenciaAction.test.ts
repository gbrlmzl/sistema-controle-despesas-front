import criarResidenciaAction from "./criarResidenciaAction";
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

describe("criarResidenciaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({ name: "Casa da Praia" });

        const resultado = await criarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o nome não é informado", async () => {
        const formData = criarFormData({ name: "" });

        const resultado = await criarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o nome da residência" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna a mensagem do Zod quando o nome é inválido", async () => {
        const formData = criarFormData({ name: "AB" });

        const resultado = await criarResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "O nome da residência deve ter no mínimo 3 caracteres",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia o nome validado e devolve a residência criada em data", async () => {
        mockApiFetch.mockResolvedValue({ residence: { name: "Casa da Praia", code: "AB12CD" } });

        const formData = criarFormData({ name: "  Casa da Praia  " });

        const resultado = await criarResidenciaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences", {
            method: "POST",
            body: { name: "Casa da Praia" },
        });
        expect(resultado).toEqual({
            success: true,
            message: "Residência criada com sucesso!",
            data: { name: "Casa da Praia", code: "AB12CD" },
        });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(429, "Limite de residências atingido"));

        const formData = criarFormData({ name: "Casa da Praia" });

        const resultado = await criarResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Limite de residências atingido" });
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({ name: "Casa da Praia" });

        const resultado = await criarResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao criar residência. Tente novamente mais tarde.",
        });
    });
});
