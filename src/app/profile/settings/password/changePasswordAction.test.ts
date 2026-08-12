import changePasswordAction from "./changePasswordAction";
import { apiFetch } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient", () => ({
    apiFetch: jest.fn(),
    ApiError: jest.requireActual("@/lib/apiError").ApiError,
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function criarFormData(campos: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [chave, valor] of Object.entries(campos)) {
        formData.set(chave, valor);
    }
    return formData;
}

const CAMPOS_VALIDOS = {
    currentPassword: "senhaAntiga1",
    newPassword: "senhaNova1",
    confirmNewPassword: "senhaNova1",
};

beforeEach(() => {
    mockApiFetch.mockReset();
});

describe("changePasswordAction", () => {
    it("retorna erro e não chama a API quando algum campo obrigatório está vazio", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, currentPassword: "" });

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Não pode haver campos vazios" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("rejeita nova senha com menos de 8 caracteres", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, newPassword: "abc123", confirmNewPassword: "abc123" });

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "A nova senha deve ter pelo menos 8 caracteres" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("rejeita nova senha sem número ou símbolo", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, newPassword: "somenteletras", confirmNewPassword: "somenteletras" });

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "A nova senha deve conter ao menos um número ou símbolo",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("rejeita quando a confirmação da nova senha diverge", async () => {
        const formData = criarFormData({ ...CAMPOS_VALIDOS, confirmNewPassword: "outraSenha1" });

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "As novas senhas não coincidem" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia PATCH com as três senhas e devolve a mensagem de confirmação", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await changePasswordAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/users/me/password", {
            method: "PATCH",
            body: {
                currentPassword: "senhaAntiga1",
                newPassword: "senhaNova1",
                confirmNewPassword: "senhaNova1",
            },
        });
        expect(resultado).toEqual({ success: true, message: "Senha atualizada com sucesso" });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(401, "Senha atual incorreta"));

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Senha atual incorreta" });
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData(CAMPOS_VALIDOS);

        const resultado = await changePasswordAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro na operação. Tente novamente mais tarde.",
        });
    });
});
