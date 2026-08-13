import renomearResidenciaAction from "./renomearResidenciaAction";
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

describe("renomearResidenciaAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const formData = criarFormData({ code: "AB12CD", name: "Casa Nova" });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna erro quando o nome não é informado", async () => {
        const formData = criarFormData({ code: "AB12CD", name: "" });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Informe o nome da residência" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("retorna a mensagem do Zod quando o nome é inválido", async () => {
        const formData = criarFormData({ code: "AB12CD", name: "AB" });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "O nome da residência deve ter no mínimo 3 caracteres",
        });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, envia PATCH com o nome validado e revalida as duas rotas", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const formData = criarFormData({ code: "AB12CD", name: "  Casa Nova  " });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD", {
            method: "PATCH",
            body: { name: "Casa Nova" },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD");
        expect(mockRevalidatePath).toHaveBeenCalledWith("/app/residences");
        expect(resultado).toEqual({ success: true, message: "Nome da residência atualizado!" });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o proprietário pode renomear a residência"));

        const formData = criarFormData({ code: "AB12CD", name: "Casa Nova" });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(resultado).toEqual({ success: false, message: "Só o proprietário pode renomear a residência" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const formData = criarFormData({ code: "AB12CD", name: "Casa Nova" });

        const resultado = await renomearResidenciaAction(null, formData);

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao renomear a residência. Tente novamente mais tarde.",
        });
    });
});
