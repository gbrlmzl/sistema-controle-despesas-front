import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastrarDespesaForm from "./CadastrarDespesaForm";
import cadastrarDespesaAction from "../cadastrarDespesaAction";

//Mock com factory explícita: a action real importa getCurrentUser, que puxa next/cache
//e usa TextEncoder — indisponível no ambiente jsdom dos testes. A factory evita carregar
//o módulo real, diferente do automock (jest.mock sem segundo argumento).
jest.mock("../cadastrarDespesaAction", () => jest.fn());

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockCadastrarDespesaAction = cadastrarDespesaAction as jest.MockedFunction<typeof cadastrarDespesaAction>;

const residencia = { code: "AB12CD" };
const competencia = { month: 8, year: 2026 };

function getSubmitButton() {
    return screen.getByRole("button", { name: "Cadastrar despesa" });
}

beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockCadastrarDespesaAction.mockReset();
});

describe("CadastrarDespesaForm", () => {
    it("exibe a competência recebida por props", () => {
        render(<CadastrarDespesaForm residencia={residencia} competencia={competencia} />);
        expect(screen.getByText("Agosto de 2026")).toBeInTheDocument();
    });

    it("mantém o botão de envio desabilitado até nome, valor e categoria serem preenchidos", async () => {
        const user = userEvent.setup();
        render(<CadastrarDespesaForm residencia={residencia} competencia={competencia} />);

        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("Nome da despesa"), "Supermercado");
        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("Valor (ex.: 180,50)"), "180,50");
        expect(getSubmitButton()).toBeDisabled();

        await user.selectOptions(screen.getByRole("combobox"), "ALIMENTACAO");
        expect(getSubmitButton()).toBeEnabled();
    });

    it("limpa os campos e mostra a confirmação quando o cadastro é bem-sucedido", async () => {
        mockCadastrarDespesaAction.mockResolvedValue({ success: true, message: "Despesa cadastrada!" });
        const user = userEvent.setup();
        render(<CadastrarDespesaForm residencia={residencia} competencia={competencia} />);

        await user.type(screen.getByPlaceholderText("Nome da despesa"), "Supermercado");
        await user.type(screen.getByPlaceholderText("Valor (ex.: 180,50)"), "180,50");
        await user.selectOptions(screen.getByRole("combobox"), "ALIMENTACAO");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Despesa cadastrada!")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Nome da despesa")).toHaveValue("");
        expect(screen.getByPlaceholderText("Valor (ex.: 180,50)")).toHaveValue("");
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("exibe a mensagem de erro e preserva os campos quando o cadastro falha", async () => {
        mockCadastrarDespesaAction.mockResolvedValue({ success: false, message: "Competência fechada" });
        const user = userEvent.setup();
        render(<CadastrarDespesaForm residencia={residencia} competencia={competencia} />);

        await user.type(screen.getByPlaceholderText("Nome da despesa"), "Supermercado");
        await user.type(screen.getByPlaceholderText("Valor (ex.: 180,50)"), "180,50");
        await user.selectOptions(screen.getByRole("combobox"), "ALIMENTACAO");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Competência fechada")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Nome da despesa")).toHaveValue("Supermercado");
    });
});
