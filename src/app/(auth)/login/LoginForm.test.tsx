import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient.client");

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function getSubmitButton() {
    return screen.getByRole("button", { name: "Entrar" });
}

beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockApiFetchClient.mockReset();
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

    it("envia usuário e senha para a API e redireciona ao autenticar com sucesso", async () => {
        mockApiFetchClient.mockResolvedValue(undefined);
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
        expect(mockRefresh).toHaveBeenCalled();
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
    });
});
