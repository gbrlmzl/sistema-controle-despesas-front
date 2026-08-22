import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { useSetCurrentUser } from "@/components/providers/UserProvider";
import type { AuthUser } from "@/types/auth";

jest.mock("@/lib/apiClient.client");
jest.mock("@/components/providers/UserProvider");

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;
const mockUseSetCurrentUser = useSetCurrentUser as jest.MockedFunction<typeof useSetCurrentUser>;
const mockSetUser = jest.fn();

const USUARIO_LOGADO: AuthUser = {
    id: 1,
    name: "Victor Hugo",
    username: "victor_25",
    email: "victor@example.com",
    profilePic: null,
};

function getSubmitButton() {
    return screen.getByRole("button", { name: "Entrar" });
}

beforeEach(() => {
    mockPush.mockClear();
    mockApiFetchClient.mockReset();
    mockSetUser.mockClear();
    mockUseSetCurrentUser.mockReturnValue(mockSetUser);
});

describe("LoginForm", () => {
    it("mantém o botão de envio desabilitado até username e senha serem preenchidos", () => {
        render(<LoginForm />);
        expect(getSubmitButton()).toBeDisabled();
    });

    it("habilita o botão de envio quando username e senha estão preenchidos", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByPlaceholderText("Nome de usuário"), "victor_25");
        await user.type(screen.getByPlaceholderText("Senha"), "senha123");

        expect(getSubmitButton()).toBeEnabled();
    });

    it("alterna a visibilidade da senha ao clicar no ícone", async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        const campoSenha = screen.getByPlaceholderText("Senha");
        expect(campoSenha).toHaveAttribute("type", "password");

        await user.click(screen.getByAltText("Mostrar/Ocultar senha"));

        expect(campoSenha).toHaveAttribute("type", "text");
    });

    it("não mostra o botão de login com Google quando googleAuthEnabled não é passado (default false)", () => {
        render(<LoginForm />);
        expect(screen.queryByText("Continuar com Google")).not.toBeInTheDocument();
    });

    it("mostra o botão de login com Google, apontando pro Route Handler de proxy, quando googleAuthEnabled é true", () => {
        render(<LoginForm googleAuthEnabled />);
        const botaoGoogle = screen.getByText("Continuar com Google").closest("a");
        expect(botaoGoogle).toHaveAttribute("href", "/api/auth/google");
    });

    it("envia usuário e senha para a API, atualiza o contexto de usuário e redireciona ao autenticar com sucesso", async () => {
        mockApiFetchClient.mockResolvedValue({ user: USUARIO_LOGADO });
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByPlaceholderText("Nome de usuário"), "victor_25");
        await user.type(screen.getByPlaceholderText("Senha"), "senha123");
        await user.click(getSubmitButton());

        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledWith("/auth/login", {
            method: "POST",
            skipAuthRetry: true,
            body: { username: "victor_25", password: "senha123" },
        }));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
        expect(mockSetUser).toHaveBeenCalledWith(USUARIO_LOGADO);
    });

    it("traz um link para /forgot-password", () => {
        render(<LoginForm />);
        expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/forgot-password");
    });

    it("exibe a mensagem de erro da API quando a autenticação falha", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(401, "Usuário ou senha inválidos"));
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByPlaceholderText("Nome de usuário"), "victor_25");
        await user.type(screen.getByPlaceholderText("Senha"), "senhaerrada");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Usuário ou senha inválidos")).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockSetUser).not.toHaveBeenCalled();
    });
});
