import { render, screen } from "@testing-library/react";
import ResumoDoMes from "./ResumoDoMes";
import type { Competencia } from "@/types/competencia";
import type { ResumoCompetencia, AtividadeItem } from "@/types/residencia";
import type { ParticipanteRateio, Evolucao, Comparativo } from "@/types/relatorios";

const COMPETENCIA: Competencia = { month: 8, year: 2026 };
const ATIVIDADE: AtividadeItem[] = [];
const EVOLUCAO: Evolucao = [];
const COMPARATIVO: Comparativo = {
    totalAtualInCents: 0,
    totalAnteriorInCents: 0,
    variacaoInCents: 0,
    percentual: null,
    temBaseDeComparacao: false,
    categorias: [],
};

function resumoBase(overrides: Partial<ResumoCompetencia> = {}): ResumoCompetencia {
    return {
        totalInCents: 10000,
        quantidade: 3,
        isClosed: false,
        settlement: null,
        porMembro: [],
        ...overrides,
    };
}

function renderizar(resumo: ResumoCompetencia, saldoPessoal: ParticipanteRateio | null = null) {
    return render(
        <ResumoDoMes
            codigo="AB12CD"
            competencia={COMPETENCIA}
            resumo={resumo}
            atividade={ATIVIDADE}
            saldoPessoal={saldoPessoal}
            evolucao={EVOLUCAO}
            comparativo={COMPARATIVO} />
    );
}

describe("ResumoDoMes -- selo da competência (C.1)", () => {
    it("não mostra selo quando a competência está aberta", () => {
        renderizar(resumoBase({ isClosed: false }));

        expect(screen.queryByText("fechado")).not.toBeInTheDocument();
        expect(screen.queryByText(/aguardando/)).not.toBeInTheDocument();
        expect(screen.queryByText("mês quitado")).not.toBeInTheDocument();
    });

    it("mostra 'fechado' quando não há settlement (legado ou sem linhas)", () => {
        renderizar(resumoBase({ isClosed: true, settlement: null }));

        expect(screen.getByText("fechado")).toBeInTheDocument();
    });

    it("mostra 'aguardando pagamento' com a contagem do lado payer", () => {
        renderizar(resumoBase({
            isClosed: true,
            settlement: {
                status: "AWAITING_PAYMENT",
                totals: { payerSide: { lines: 2, paid: 1 }, receiverSide: { lines: 2, confirmed: 0 } },
                mine: [],
            },
        }));

        expect(screen.getByText("aguardando pagamento · 1 de 2")).toBeInTheDocument();
    });

    it("mostra 'aguardando confirmação' com a contagem do lado receiver", () => {
        renderizar(resumoBase({
            isClosed: true,
            settlement: {
                status: "AWAITING_CONFIRMATION",
                totals: { payerSide: { lines: 2, paid: 2 }, receiverSide: { lines: 2, confirmed: 1 } },
                mine: [],
            },
        }));

        expect(screen.getByText("aguardando confirmação · 1 de 2")).toBeInTheDocument();
    });

    it("mostra 'mês quitado' quando todas as linhas estão liquidadas", () => {
        renderizar(resumoBase({
            isClosed: true,
            settlement: {
                status: "SETTLED",
                totals: { payerSide: { lines: 2, paid: 2 }, receiverSide: { lines: 2, confirmed: 2 } },
                mine: [],
            },
        }));

        expect(screen.getByText("mês quitado")).toBeInTheDocument();
    });
});

describe("ResumoDoMes -- chamada de 'Ver acertos' no card de saldo (C.1)", () => {
    const SALDO_PESSOAL: ParticipanteRateio = {
        userId: 1,
        name: "Gabriel Mizael",
        gastoInCents: 5000,
        cotaInCents: 6000,
        saldoInCents: -1000,
        recebe: false,
        paga: true,
    };

    it("não mostra a chamada quando settlement é null", () => {
        renderizar(resumoBase({ isClosed: true, settlement: null }), SALDO_PESSOAL);

        expect(screen.queryByText("Ver acertos")).not.toBeInTheDocument();
    });

    it("não mostra a chamada quando não há linha PENDING em 'mine'", () => {
        renderizar(resumoBase({
            isClosed: true,
            settlement: {
                status: "SETTLED",
                totals: { payerSide: { lines: 1, paid: 1 }, receiverSide: { lines: 1, confirmed: 1 } },
                mine: [{ id: "s1", role: "PAYER", counterpartyName: "Ana Prado", amountInCents: 1000, status: "SETTLED" }],
            },
        }), SALDO_PESSOAL);

        expect(screen.queryByText("Ver acertos")).not.toBeInTheDocument();
    });

    it("mostra a chamada com o link para a tela de acertos da competência em exibição", () => {
        renderizar(resumoBase({
            isClosed: true,
            settlement: {
                status: "AWAITING_PAYMENT",
                totals: { payerSide: { lines: 1, paid: 0 }, receiverSide: { lines: 1, confirmed: 0 } },
                mine: [{ id: "s1", role: "PAYER", counterpartyName: "Ana Prado", amountInCents: 1000, status: "PENDING" }],
            },
        }), SALDO_PESSOAL);

        const link = screen.getByText("Ver acertos").closest("a");
        expect(link).toHaveAttribute("href", "/dashboard/residences/AB12CD/settlements?mes=8&ano=2026");
    });
});
