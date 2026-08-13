import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CadastrarDespesaModal from "./CadastrarDespesaModal";
import cadastrarDespesaAction from "@/app/dashboard/residences/[code]/expenses/cadastrarDespesaAction";

//Mock com factory explícita: a action real importa getCurrentUser, que puxa next/cache
//e usa TextEncoder — indisponível no ambiente jsdom dos testes. A factory evita carregar
//o módulo real, diferente do automock (jest.mock sem segundo argumento).
jest.mock("@/app/dashboard/residences/[code]/expenses/cadastrarDespesaAction", () => jest.fn());

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

//O modal busca a competência aberta sozinho (funciona a partir de qualquer rota,
//inclusive fora de /expenses) — os testes não precisam da chamada real à API.
jest.mock("@/hooks/useCompetenciaAberta", () => ({
    useCompetenciaAberta: () => ({ competencia: { month: 8, year: 2026 }, carregando: false }),
}));

const mockCadastrarDespesaAction = cadastrarDespesaAction as jest.MockedFunction<typeof cadastrarDespesaAction>;

const codigo = "AB12CD";

function getSubmitButton() {
    return screen.getByRole("button", { name: "Lançar despesa" });
}

//Preenche os três campos obrigatórios, na ordem do fluxo (valor em destaque,
//depois descrição, depois a grade de categorias).
async function preencherCampos(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByPlaceholderText("0,00"), "180,50");
    await user.type(screen.getByPlaceholderText("Descrição"), "Supermercado");
    await user.click(screen.getByRole("button", { name: "Alimentação" }));
}

beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockCadastrarDespesaAction.mockReset();
});

describe("CadastrarDespesaModal", () => {
    it("não renderiza nada quando fechado", () => {
        render(<CadastrarDespesaModal codigo={codigo} aberto={false} onFechar={jest.fn()} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("exibe a competência aberta quando aberto", () => {
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);
        expect(screen.getByText("Agosto de 2026", { exact: false })).toBeInTheDocument();
    });

    it("chama onFechar ao clicar em fechar", async () => {
        const onFechar = jest.fn();
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={onFechar} />);

        await user.click(screen.getByRole("button", { name: "Fechar" }));
        expect(onFechar).toHaveBeenCalled();
    });

    it("mantém o botão de envio desabilitado até nome, valor e categoria serem preenchidos", async () => {
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("Descrição"), "Supermercado");
        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("0,00"), "180,50");
        expect(getSubmitButton()).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Alimentação" }));
        expect(getSubmitButton()).toBeEnabled();
    });

    it("preenche a descrição a partir de uma sugestão", async () => {
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        await user.click(screen.getByRole("button", { name: "Mercado" }));
        expect(screen.getByPlaceholderText("Descrição")).toHaveValue("Mercado");
    });

    it("limpa os campos e mostra a confirmação quando o cadastro é bem-sucedido", async () => {
        mockCadastrarDespesaAction.mockResolvedValue({ success: true, message: "Despesa cadastrada!" });
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        await preencherCampos(user);
        await user.click(getSubmitButton());

        expect(await screen.findByText("Despesa cadastrada!")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Descrição")).toHaveValue("");
        expect(screen.getByPlaceholderText("0,00")).toHaveValue("");
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("exibe a mensagem de erro e preserva os campos quando o cadastro falha", async () => {
        mockCadastrarDespesaAction.mockResolvedValue({ success: false, message: "Competência fechada" });
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        await preencherCampos(user);
        await user.click(getSubmitButton());

        expect(await screen.findByText("Competência fechada")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Descrição")).toHaveValue("Supermercado");
    });

    //Versão desktop da categoria: um dropdown de teclado (o mobile continua com a
    //grade de ícones, testada nos casos acima). Abre com Enter — o próprio
    //comportamento nativo do <button> — e seleciona via clique ou seta + Enter.
    it("abre o dropdown de categoria com o Enter e seleciona uma opção pelo teclado", async () => {
        const user = userEvent.setup();
        const { container } = render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        const gatilho = screen.getByRole("button", { name: "Selecione uma categoria" });
        gatilho.focus();
        await user.keyboard("{Enter}");

        const listbox = screen.getByRole("listbox", { name: "Categoria" });
        expect(listbox).toBeInTheDocument();

        await user.keyboard("{ArrowDown}{ArrowDown}");
        await user.keyboard("{Enter}");

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(container.querySelector('input[name="category"]')).toHaveValue("ASSINATURAS");
        expect(screen.queryByRole("button", { name: "Selecione uma categoria" })).not.toBeInTheDocument();
    });

    it("fecha o dropdown de categoria com Escape sem alterar a seleção", async () => {
        const user = userEvent.setup();
        render(<CadastrarDespesaModal codigo={codigo} aberto={true} onFechar={jest.fn()} />);

        await user.click(screen.getByRole("button", { name: "Selecione uma categoria" }));
        expect(screen.getByRole("listbox")).toBeInTheDocument();

        await user.keyboard("{Escape}");

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Selecione uma categoria" })).toHaveFocus();
    });
});
