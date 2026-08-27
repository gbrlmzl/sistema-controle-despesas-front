import dispensarAcertoAction from "./dispensarAcertoAction";
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

function formData(campos: Record<string, string>): FormData {
    const form = new FormData();
    for (const [chave, valor] of Object.entries(campos)) {
        form.set(chave, valor);
    }
    return form;
}

const CAMPOS_BASE = { code: "AB12CD", month: "8", year: "2026", settlementId: "s1", reason: "Morador saiu da residência" };

beforeEach(() => {
    mockApiFetch.mockReset();
    mockGetCurrentUser.mockReset();
    mockRevalidatePath.mockReset();
    mockGetCurrentUser.mockResolvedValue(USUARIO_LOGADO);
});

describe("dispensarAcertoAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await dispensarAcertoAction(null, formData(CAMPOS_BASE));

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("chama a rota /waive com o :period no formato AAAA-MM e o motivo no corpo", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        await dispensarAcertoAction(null, formData(CAMPOS_BASE));

        expect(mockApiFetch).toHaveBeenCalledWith(
            "/residences/AB12CD/closures/2026-08/settlements/s1/waive",
            { method: "POST", body: { reason: "Morador saiu da residência" } },
        );
    });

    it("em sucesso, revalida a tela de acertos e devolve a mensagem de confirmação", async () => {
        mockApiFetch.mockResolvedValue(undefined);

        const resultado = await dispensarAcertoAction(null, formData(CAMPOS_BASE));

        expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/residences/AB12CD/settlements");
        expect(resultado).toEqual({ success: true, message: "Acerto dispensado." });
    });

    it("repassa a mensagem da API quando ela responde com ApiError (ex.: 403 -- não é owner)", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o proprietário pode dispensar um acerto"));

        const resultado = await dispensarAcertoAction(null, formData(CAMPOS_BASE));

        expect(resultado).toEqual({ success: false, message: "Só o proprietário pode dispensar um acerto" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await dispensarAcertoAction(null, formData(CAMPOS_BASE));

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao dispensar o acerto. Tente novamente mais tarde.",
        });
    });
});
