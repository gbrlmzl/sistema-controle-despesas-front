import registerAction from "./registerAction";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import type { AuthUser } from "@/types/auth";

jest.mock("@/lib/apiClient", () => ({
    apiFetch: jest.fn(),
    ApiError: jest.requireActual("@/lib/apiError").ApiError,
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const USUARIO_CADASTRADO: AuthUser = {
    id: 1,
    name: "Ana Silva",
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

const CAMPOS_VALIDOS = {
    name: "Ana Silva",
    username: "ana",
    email: "ana@example.com",
    password: "senha123",
    confirmPassword: "senha123",
};

beforeEach(() => {
    mockApiFetch.mockReset();
});

describe("registerAction", () => {
    it("retorna erro e não chama a API quando algum campo obrigatório está vazio", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, email: "" });

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Não pode haver campos vazios" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o campo username nem está presente no FormData", async () => {
        const formData = criarFormData(CAMPOS_VALIDOS);
        formData.delete("username");

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Não pode haver campos vazios" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("normaliza o username (trim + minúsculas) antes da validação", async () => {
        mockApiFetch.mockResolvedValue({ user: USUARIO_CADASTRADO });

        const formData = criarFormData({ ...CAMPOS_VALIDOS, username: "  ANA  " });

        await registerAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/auth/register", expect.objectContaining({
            body: expect.objectContaining({ username: "ana" }),
        }));
    });

    it("retorna a primeira mensagem de erro do Zod quando a validação falha", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, email: "não-é-email" });

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Email inválido" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("rejeita quando a confirmação de senha diverge", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, confirmPassword: "outrasenha" });

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "As senhas não coincidem" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia /auth/register com skipAuthRetry e o payload validado", async () => {
        mockApiFetch.mockResolvedValue({ user: USUARIO_CADASTRADO });

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await registerAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/auth/register", {
            method: "POST",
            skipAuthRetry: true,
            body: {
                name: "Ana Silva",
                username: "ana",
                email: "ana@example.com",
                password: "senha123",
                confirmPassword: "senha123",
            },
        });
        expect(resultado).toEqual({ success: true, message: "Usuário cadastrado com sucesso!", data: USUARIO_CADASTRADO });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(409, "Nome de usuário já está em uso"));

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Nome de usuário já está em uso" });
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await registerAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao cadastrar usuário. Tente novamente mais tarde.",
        });
    });
});
