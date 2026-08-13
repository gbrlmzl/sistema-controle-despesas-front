import regenerarCodigoAction from "./regenerarCodigoAction";
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

describe("regenerarCodigoAction", () => {
    it("retorna erro e não chama a API quando o usuário não está autenticado", async () => {
        mockGetCurrentUser.mockResolvedValue(null);

        const resultado = await regenerarCodigoAction("AB12CD");

        expect(resultado).toEqual({ success: false, message: "Usuário não autenticado" });
        expect(mockApiFetch).not.toHaveBeenCalled();
    });

    it("em sucesso, devolve o novo código em data e revalida a lista de residências", async () => {
        mockApiFetch.mockResolvedValue({ code: "ZZ99XX" });

        const resultado = await regenerarCodigoAction("AB12CD");

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/code", { method: "POST" });
        expect(mockRevalidatePath).toHaveBeenCalledWith("/app/residences");
        expect(resultado).toEqual({
            success: true,
            message: "Novo código gerado!",
            data: { code: "ZZ99XX" },
        });
    });

    it("repassa a mensagem da API quando ela responde com ApiError", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(403, "Só o proprietário pode gerar um novo código"));

        const resultado = await regenerarCodigoAction("AB12CD");

        expect(resultado).toEqual({ success: false, message: "Só o proprietário pode gerar um novo código" });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("cai na mensagem padrão quando o erro não é um ApiError", async () => {
        mockApiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await regenerarCodigoAction("AB12CD");

        expect(resultado).toEqual({
            success: false,
            message: "Erro ao gerar um novo código. Tente novamente mais tarde.",
        });
    });
});
