import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "./RegisterForm";
import registerAction from "./registerAction";

jest.mock("./registerAction");

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockRegisterAction = registerAction as jest.MockedFunction<typeof registerAction>;

function getSubmitButton() {
    return screen.getByRole("button", { name: "Criar conta" });
}

async function preencherCadastroValido(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("Nome"), "Victor Salviano");
    await user.type(screen.getByPlaceholderText("Nome de usuário"), "victor_25");
    await user.type(screen.getByPlaceholderText("Email"), "victor@example.com");
    await user.type(screen.getByPlaceholderText("Senha"), "senha123");
    await user.type(screen.getByPlaceholderText("Confirmar Senha"), "senha123");
}

beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockRegisterAction.mockReset();
});

describe("RegisterForm", () => {
    it("mantém o botão de envio desabilitado enquanto o formulário está incompleto", () => {
        render(<RegisterForm />);
        expect(getSubmitButton()).toBeDisabled();
    });

    it("habilita o botão de envio quando todos os campos são válidos", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        await preencherCadastroValido(user);

        expect(getSubmitButton()).toBeEnabled();
    });

    it("normaliza o nome de usuário para minúsculas e remove caracteres inválidos", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        const campoUsername = screen.getByPlaceholderText("Nome de usuário");
        await user.type(campoUsername, "Victor.25!");

        expect(campoUsername).toHaveValue("victor25");
    });

    it("alterna a visibilidade da senha (e da confirmação) ao clicar no ícone", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        const campoSenha = screen.getByPlaceholderText("Senha");
        const campoConfirmacao = screen.getByPlaceholderText("Confirmar Senha");
        expect(campoSenha).toHaveAttribute("type", "password");
        expect(campoConfirmacao).toHaveAttribute("type", "password");

        await user.click(screen.getByAltText("Mostrar/Ocultar senha"));

        expect(campoSenha).toHaveAttribute("type", "text");
        expect(campoConfirmacao).toHaveAttribute("type", "text");
    });

    it("marca as três condições de senha como atendidas quando a senha é válida e coincide", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        expect(screen.queryAllByAltText("Condição atendida")).toHaveLength(0);

        await user.type(screen.getByPlaceholderText("Senha"), "senha123");
        await user.type(screen.getByPlaceholderText("Confirmar Senha"), "senha123");

        expect(screen.getAllByAltText("Condição atendida")).toHaveLength(3);
    });

    it("envia os dados preenchidos para a action e redireciona ao ser bem-sucedido", async () => {
        mockRegisterAction.mockResolvedValue({ success: true, message: "Usuário cadastrado com sucesso!" });
        const user = userEvent.setup();
        render(<RegisterForm />);

        await preencherCadastroValido(user);
        await user.click(getSubmitButton());

        await waitFor(() => expect(mockRegisterAction).toHaveBeenCalledTimes(1));
        const formDataEnviado = mockRegisterAction.mock.calls[0][1] as FormData;
        expect(formDataEnviado.get("username")).toBe("victor_25");
        expect(formDataEnviado.get("email")).toBe("victor@example.com");

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("exibe a mensagem de erro devolvida pela action quando o cadastro falha", async () => {
        mockRegisterAction.mockResolvedValue({ success: false, message: "Nome de usuário já em uso" });
        const user = userEvent.setup();
        render(<RegisterForm />);

        await preencherCadastroValido(user);
        await user.click(getSubmitButton());

        expect(await screen.findByText("Nome de usuário já em uso")).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
    });
});
