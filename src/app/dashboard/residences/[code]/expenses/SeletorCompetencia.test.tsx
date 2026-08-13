import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeletorCompetencia from "./SeletorCompetencia";
import type { Competencia } from "@/types/competencia";
import type { CompetenciaComDespesas } from "@/types/residencia";

//O componente é "burro": não busca nada sozinho, só recebe `competencias` pronta
//via prop (quem chama a API é getResidenceCompetencies, em src/lib/expensesApi.ts,
//dentro de um Server Component). Por isso o teste não mockeia nenhuma chamada de
//rede — o stub abaixo já FAZ o papel do que a API teria devolvido depois de mapeado.
const competenciaAtual: Competencia = { month: 8, year: 2026 }; // Agosto/2026

const competenciasStub: CompetenciaComDespesas[] = [
    { month: 6, year: 2026, temDespesas: true, isClosed: true },  // Junho — fechado
    { month: 7, year: 2026, temDespesas: true, isClosed: false }, // Julho — aberto
];

function renderSeletor(onSelecionar = jest.fn()) {
    render(
        <SeletorCompetencia
            competencia={competenciaAtual}
            competencias={competenciasStub}
            onSelecionar={onSelecionar} />
    );
    return onSelecionar;
}

async function abrirPainel(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Agosto de 2026" }));
}

describe("SeletorCompetencia", () => {
    it("não mostra o calendário antes de abrir o painel", () => {
        renderSeletor();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("abre o calendário com o ano da competência atual ao clicar no gatilho", async () => {
        const user = userEvent.setup();
        renderSeletor();

        await abrirPainel(user);

        expect(screen.getByRole("dialog", { name: "Selecionar competência" })).toBeInTheDocument();
        expect(screen.getByText("2026")).toBeInTheDocument();
    });

    it("destaca em verde os meses com despesa em aberto", async () => {
        const user = userEvent.setup();
        renderSeletor();
        await abrirPainel(user);

        const julho = screen.getByTitle("Julho de 2026");
        expect(julho).toHaveClass("mesAberto");
        expect(julho).not.toHaveClass("mesFechado");
        expect(julho).not.toHaveClass("semDespesas");
    });

    it("destaca com outra cor os meses com despesa já fechada", async () => {
        const user = userEvent.setup();
        renderSeletor();
        await abrirPainel(user);

        const junho = screen.getByTitle("Junho de 2026");
        expect(junho).toHaveClass("mesFechado");
        expect(junho).not.toHaveClass("mesAberto");
        expect(junho).not.toHaveClass("semDespesas");
    });

    it("mantém apagados os meses sem nenhuma despesa lançada", async () => {
        const user = userEvent.setup();
        renderSeletor();
        await abrirPainel(user);

        expect(screen.getByTitle("Maio de 2026")).toHaveClass("semDespesas");
    });

    it("marca como selecionado o mês da competência atual", async () => {
        const user = userEvent.setup();
        renderSeletor();
        await abrirPainel(user);

        expect(screen.getByTitle("Agosto de 2026")).toHaveClass("selecionado");
        expect(screen.getByTitle("Julho de 2026")).not.toHaveClass("selecionado");
    });

    it("chama onSelecionar com o mês e o ano corretos e fecha o painel", async () => {
        const user = userEvent.setup();
        const onSelecionar = renderSeletor();
        await abrirPainel(user);

        await user.click(screen.getByTitle("Julho de 2026"));

        expect(onSelecionar).toHaveBeenCalledTimes(1);
        expect(onSelecionar).toHaveBeenCalledWith(7, 2026);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("recalcula o destaque ao trocar de ano, sem misturar competências de anos diferentes", async () => {
        const user = userEvent.setup();
        renderSeletor();
        await abrirPainel(user);

        await user.click(screen.getByLabelText("Próximo ano"));

        expect(screen.getByText("2027")).toBeInTheDocument();
        //Julho tinha despesa em aberto em 2026; em 2027 é um mês novo, sem nada lançado
        expect(screen.getByTitle("Julho de 2027")).toHaveClass("semDespesas");
    });

    it("não chama onSelecionar apenas ao navegar entre anos", async () => {
        const user = userEvent.setup();
        const onSelecionar = renderSeletor();
        await abrirPainel(user);

        await user.click(screen.getByLabelText("Próximo ano"));
        await user.click(screen.getByLabelText("Ano anterior"));

        expect(onSelecionar).not.toHaveBeenCalled();
    });

    it("sempre reabre o painel a partir do ano da competência atual", async () => {
        const user = userEvent.setup();
        const onSelecionar = renderSeletor();
        await abrirPainel(user);

        await user.click(screen.getByLabelText("Próximo ano"));
        expect(screen.getByText("2027")).toBeInTheDocument();

        //seleciona um mês em 2027 pelo mesmo caminho que o usuário usaria, fechando o painel
        await user.click(screen.getByTitle("Março de 2027"));
        expect(onSelecionar).toHaveBeenCalledWith(3, 2027);

        //reabre: mesmo tendo navegado até 2027 da última vez, volta pro ano da competência atual
        await abrirPainel(user);
        expect(screen.getByText("2026")).toBeInTheDocument();
        expect(screen.queryByText("2027")).not.toBeInTheDocument();
    });
});
