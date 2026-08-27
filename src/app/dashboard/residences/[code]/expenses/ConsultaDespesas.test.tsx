import { render, screen } from "@testing-library/react";
import ConsultaDespesas from "./ConsultaDespesas";
import type { Residencia, ResumoDespesas, CompetenciaComDespesas } from "@/types/residencia";
import type { Competencia } from "@/types/competencia";

//As três Server Actions só importam pra virar callback de clique -- nenhum
//teste aqui exercita o fluxo de fechar/reabrir/excluir, então basta um mock
//vazio pra evitar qualquer chamada de rede acidental.
jest.mock("./excluirDespesaAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./fecharMesAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./reabrirMesAction", () => ({ __esModule: true, default: jest.fn() }));
//EditarDespesaModal e CadastrarDespesaModal importam as próprias actions, que
//importam next/cache -- sem mock, o jsdom quebra com "TextEncoder is not
//defined" (mesma armadilha que CadastrarDespesaModal.test.tsx já documenta).
jest.mock("./editarDespesaAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/app/dashboard/residences/[code]/expenses/cadastrarDespesaAction", () => jest.fn());

jest.mock("@/hooks/useCompetenciaAberta", () => ({
    useCompetenciaAberta: () => ({ competencia: { month: 8, year: 2026 }, carregando: false }),
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const RESIDENCIA: Residencia = {
    name: "Casa das Flores",
    code: "AB12CD",
    ownerName: "Gabriel Mizael",
    isOwner: true,
    isArchived: false,
    members: [],
};

const COMPETENCIA: Competencia = { month: 8, year: 2026 };
const COMPETENCIAS: CompetenciaComDespesas[] = [];

function resumoBase(overrides: Partial<ResumoDespesas> = {}): ResumoDespesas {
    return {
        porMembro: [],
        totalInCents: 0,
        quantidade: 0,
        isClosed: false,
        closedAt: null,
        closedByName: null,
        settlement: null,
        ...overrides,
    };
}

describe("ConsultaDespesas -- link para a tela de acertos (C.2)", () => {
    it("não mostra o link 'Ver acertos' quando a competência está aberta", () => {
        render(
            <ConsultaDespesas
                residencia={RESIDENCIA}
                usuarioId={1}
                competencias={COMPETENCIAS}
                competencia={COMPETENCIA}
                resumo={resumoBase({ isClosed: false })}
                isCompetenciaAberta={true}
                podeReabrir={false} />
        );

        expect(screen.queryByText("Ver acertos")).not.toBeInTheDocument();
    });

    it("mostra o link 'Ver acertos' apontando pra competência em exibição quando o mês está fechado", () => {
        render(
            <ConsultaDespesas
                residencia={RESIDENCIA}
                usuarioId={1}
                competencias={COMPETENCIAS}
                competencia={COMPETENCIA}
                resumo={resumoBase({ isClosed: true, closedByName: "Gabriel Mizael" })}
                isCompetenciaAberta={false}
                podeReabrir={true} />
        );

        const link = screen.getByText("Ver acertos").closest("a");
        expect(link).toHaveAttribute("href", "/dashboard/residences/AB12CD/settlements?mes=8&ano=2026");
    });

    it("mostra o link mesmo em fechamento legado sem settlement (D-09) -- a tela lida com a lista vazia", () => {
        render(
            <ConsultaDespesas
                residencia={RESIDENCIA}
                usuarioId={1}
                competencias={COMPETENCIAS}
                competencia={COMPETENCIA}
                resumo={resumoBase({ isClosed: true, settlement: null })}
                isCompetenciaAberta={false}
                podeReabrir={true} />
        );

        expect(screen.getByText("Ver acertos")).toBeInTheDocument();
    });
});
