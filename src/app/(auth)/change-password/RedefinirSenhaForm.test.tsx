import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RedefinirSenhaForm from "./RedefinirSenhaForm";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient.client");

const mockReplace = jest.fn();
let tokenNaUrl: string | null = null;

jest.mock("next/navigation", () => ({
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => "/change-password",
    useSearchParams: () => ({ get: (chave: string) => (chave === "token" ? tokenNaUrl : null) }),
}));

const mockLogout = jest.fn();
jest.mock("@/hooks/useLogout", () => ({
    useLogout: () => ({ logout: mockLogout, isLoggingOut: false }),
}));

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function getSubmitButton() {
    return screen.getByRole("button", { name: "Redefinir senha" });
}

async function preencherSenhaValida(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("Nova senha"), "senha123");
    await user.type(screen.getByPlaceholderText("Confirmar nova senha"), "senha123");
}

beforeEach(() => {
    mockReplace.mockClear();
    mockLogout.mockClear();
    mockApiFetchClient.mockReset();
    tokenNaUrl = null;
});

describe("RedefinirSenhaForm", () => {
    it("sem ?token= na URL, vai direto para o estado inválido sem chamar a API", async () => {
        render(<RedefinirSenhaForm />);

        expect(await screen.findByText("Este link expirou ou já foi usado")).toBeInTheDocument();
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("token que o /verify recusa mostra o estado inválido, sem formulário", async () => {
        tokenNaUrl = "token-invalido";
        mockApiFetchClient.mockRejectedValue(new ApiError(400, "Token inválido ou expirado"));
        render(<RedefinirSenhaForm />);

        expect(await screen.findByText("Este link expirou ou já foi usado")).toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Nova senha")).not.toBeInTheDocument();
    });

    it("token válido mostra o formulário, com as condições de senha reagindo ao que é digitado", async () => {
        tokenNaUrl = "token-valido";
        mockApiFetchClient.mockResolvedValueOnce({ valid: true });
        const user = userEvent.setup();
        render(<RedefinirSenhaForm />);

        expect(await screen.findByPlaceholderText("Nova senha")).toBeInTheDocument();
        expect(screen.queryAllByAltText("Condição atendida")).toHaveLength(0);

        await preencherSenhaValida(user);

        expect(screen.getAllByAltText("Condição atendida")).toHaveLength(3);
    });

    it("submissão bem-sucedida chama /auth/reset-password com o token e as duas senhas, e chama logout()", async () => {
        tokenNaUrl = "token-valido";
        mockApiFetchClient.mockResolvedValueOnce({ valid: true });
        const user = userEvent.setup();
        render(<RedefinirSenhaForm />);

        await screen.findByPlaceholderText("Nova senha");
        await preencherSenhaValida(user);

        mockApiFetchClient.mockResolvedValueOnce({ message: "Senha redefinida com sucesso!" });
        await user.click(getSubmitButton());

        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledWith("/auth/reset-password", {
            method: "POST",
            skipAuthRetry: true,
            body: { token: "token-valido", newPassword: "senha123", confirmNewPassword: "senha123" },
        }));

        await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    });

    it("um 400 na submissão volta para o estado inválido", async () => {
        tokenNaUrl = "token-valido";
        mockApiFetchClient.mockResolvedValueOnce({ valid: true });
        const user = userEvent.setup();
        render(<RedefinirSenhaForm />);

        await screen.findByPlaceholderText("Nova senha");
        await preencherSenhaValida(user);

        mockApiFetchClient.mockRejectedValueOnce(new ApiError(400, "Token inválido ou expirado"));
        await user.click(getSubmitButton());

        expect(await screen.findByText("Este link expirou ou já foi usado")).toBeInTheDocument();
        expect(mockLogout).not.toHaveBeenCalled();
    });

    it("limpa o token da URL chamando router.replace", async () => {
        tokenNaUrl = "token-valido";
        mockApiFetchClient.mockResolvedValueOnce({ valid: true });
        render(<RedefinirSenhaForm />);

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/change-password"));
    });
});
