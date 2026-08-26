import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AcertosDaCompetencia from "./AcertosDaCompetencia";
import confirmarRecebimentoAction from "./confirmarRecebimentoAction";
import dispensarAcertoAction from "./dispensarAcertoAction";
import { apiFetchClient } from "@/lib/apiClient.client";
import type { Residencia, CompetenciaComDespesas } from "@/types/residencia";
import type { ResumoAcertos, Acerto } from "@/types/acerto";

jest.mock("./confirmarRecebimentoAction", () => jest.fn());
//DispensarAcertoModal importa dispensarAcertoAction, que importa next/cache --
//sem mock, TextEncoder é indisponível no jsdom (mesma armadilha do
//CadastrarDespesaModal.test.tsx).
jest.mock("./dispensarAcertoAction", () => jest.fn());
//Comprovante busca a própria URL via apiFetchClient (F-15) -- automock evita
//qualquer chamada de rede real quando uma linha tem receipts.
jest.mock("@/lib/apiClient.client");

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), refresh: mockRefresh }),
}));

const mockConfirmarRecebimentoAction = confirmarRecebimentoAction as jest.MockedFunction<typeof confirmarRecebimentoAction>;
const mockDispensarAcertoAction = dispensarAcertoAction as jest.MockedFunction<typeof dispensarAcertoAction>;
const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

const RESIDENCIA: Residencia = {
    name: "Casa das Flores",
    code: "AB12CD",
    ownerName: "Gabriel Mizael",
    isOwner: true,
    isArchived: false,
    members: [],
};

const COMPETENCIAS: CompetenciaComDespesas[] = [];

function acertoBase(overrides: Partial<Acerto> = {}): Acerto {
    return {
        id: "s1",
        payer: { userId: 7, name: "Letícia Rocha" },
        receiver: { userId: 3, name: "Gabriel Mizael" },
        amountInCents: 21910,
        isMinePaying: false,
        isMineReceiving: false,
        status: "PENDING",
        paidAt: null,
        confirmedAt: null,
        waivedAt: null,
        waiveReason: null,
        receipts: [],
        ...overrides,
    };
}

function resumoBase(acertos: Acerto[]): ResumoAcertos {
    return {
        competencia: { month: 8, year: 2026 },
        closedAt: "2026-09-01T14:02:11.000Z",
        closedByName: "Gabriel Mizael",
        status: "AWAITING_PAYMENT",
        settledAt: null,
        totals: { payerSide: { lines: acertos.length, paid: 0 }, receiverSide: { lines: acertos.length, confirmed: 0 } },
        canAct: true,
        canUpload: true,
        acertos,
    };
}

beforeEach(() => {
    mockConfirmarRecebimentoAction.mockReset();
    mockDispensarAcertoAction.mockReset();
    mockRefresh.mockReset();
    mockApiFetchClient.mockReset();
    mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante", expiresInSeconds: 300 });
});

describe("AcertosDaCompetencia", () => {
    it("mostra a seção 'Seus acertos' só com as linhas em que o usuário é payer ou receiver, sem repeti-las em 'Todos'", () => {
        const minha = acertoBase({ id: "minha", isMinePaying: true });
        const alheia = acertoBase({ id: "alheia", payer: { userId: 8, name: "Ana Prado" }, receiver: { userId: 9, name: "Bruno Alves" } });

        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([minha, alheia])} />);

        expect(screen.getByRole("heading", { name: "Seus acertos" })).toBeInTheDocument();
        // A linha "minha" só aparece em "Seus acertos" -- "Todos os acertos do mês" não repete
        expect(screen.getAllByText("Letícia Rocha → Gabriel Mizael")).toHaveLength(1);
        expect(screen.getByText("Ana Prado → Bruno Alves")).toBeInTheDocument();
    });

    it("não mostra 'Seus acertos' quando o usuário não está em nenhuma linha", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase()])} />);

        expect(screen.queryByRole("heading", { name: "Seus acertos" })).not.toBeInTheDocument();
    });

    it("mostra os dois indicadores independentes -- comprovante e confirmação -- mesmo quando só um está preenchido", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ paidAt: "2026-09-03T09:11:00.000Z", confirmedAt: null }),
        ])} />);

        expect(screen.getByText(/Comprovante anexado/)).toBeInTheDocument();
        expect(screen.getByText("Recebimento ainda não confirmado")).toBeInTheDocument();
    });

    it("permite o credor confirmar antes do devedor anexar (RN-076) -- indicador de comprovante continua pendente, sem travar nada", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ paidAt: null, confirmedAt: "2026-09-03T09:11:00.000Z" }),
        ])} />);

        expect(screen.getByText("Comprovante ainda não anexado")).toBeInTheDocument();
        expect(screen.getByText(/Recebimento confirmado/)).toBeInTheDocument();
    });

    it("mostra o motivo da dispensa em vez dos indicadores quando a linha foi dispensada (RN-082)", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ waivedAt: "2026-09-05T00:00:00.000Z", waiveReason: "Morador saiu da residência" }),
        ])} />);

        expect(screen.getByText("Dispensado: Morador saiu da residência")).toBeInTheDocument();
        expect(screen.queryByText(/Comprovante/)).not.toBeInTheDocument();
    });

    it("mostra o texto de ajuda sobre os pares sempre, independente de haver linhas", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([])} />);

        expect(screen.getByText(/calculados para minimizar o número de transferências/)).toBeInTheDocument();
    });

    it("mostra o estado vazio quando o fechamento não tem nenhuma linha (legado, D-09)", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([])} />);

        expect(screen.getByText("Nenhum acerto nesta competência.")).toBeInTheDocument();
    });
});

//"Seus acertos" reúne as linhas do usuário; "Todos os acertos do mês" (owner-only)
//reúne só as demais -- as duas nunca compartilham uma linha. Por isso cada teste
//usa o escopo de onde a linha realmente está: secaoSeus() para linhas "minhas",
//secaoTodos() para as demais.
function secaoSeus() {
    return within(screen.getByRole("heading", { name: "Seus acertos" }).closest("section")!);
}

function secaoTodos() {
    return within(screen.getByRole("heading", { name: "Todos os acertos do mês" }).closest("section")!);
}

describe("AcertosDaCompetencia -- 'Todos os acertos do mês' é owner-only e não repete 'Seus acertos'", () => {
    it("não mostra a seção pra um membro comum, mesmo havendo pares de outras pessoas", () => {
        const minha = acertoBase({ id: "minha", isMineReceiving: true });
        const alheia = acertoBase({ id: "alheia", payer: { userId: 8, name: "Ana Prado" }, receiver: { userId: 9, name: "Bruno Alves" } });

        render(<AcertosDaCompetencia residencia={{ ...RESIDENCIA, isOwner: false }} competencias={COMPETENCIAS} resumo={resumoBase([minha, alheia])} />);

        expect(screen.queryByRole("heading", { name: "Todos os acertos do mês" })).not.toBeInTheDocument();
        expect(screen.queryByText("Ana Prado → Bruno Alves")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Seus acertos" })).toBeInTheDocument();
    });

    it("mostra a seção pro owner, mas sem repetir as linhas que já aparecem em 'Seus acertos'", () => {
        const minha = acertoBase({ id: "minha", isMineReceiving: true });
        const alheia = acertoBase({ id: "alheia", payer: { userId: 8, name: "Ana Prado" }, receiver: { userId: 9, name: "Bruno Alves" } });

        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([minha, alheia])} />);

        expect(secaoTodos().getByText("Ana Prado → Bruno Alves")).toBeInTheDocument();
        expect(secaoTodos().queryByText("Letícia Rocha → Gabriel Mizael")).not.toBeInTheDocument();
    });

    it("mostra uma mensagem de vazio pro owner quando todos os pares do mês já estão em 'Seus acertos'", () => {
        const minha = acertoBase({ id: "minha", isMineReceiving: true });

        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([minha])} />);

        expect(secaoTodos().getByText("Nenhum outro acerto nesta competência.")).toBeInTheDocument();
    });
});

describe("AcertosDaCompetencia -- confirmar recebimento (C.3, F-13)", () => {
    it("mostra o botão só para quem é receiver da linha, e nunca pra quem é payer", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ id: "sou-receiver", isMineReceiving: true }),
            acertoBase({ id: "sou-payer", isMinePaying: true }),
        ])} />);

        expect(secaoSeus().getAllByRole("button", { name: "Confirmar recebimento" })).toHaveLength(1);
    });

    it("não mostra o botão quando a linha já está liquidada ou dispensada", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMineReceiving: true, status: "SETTLED", paidAt: "2026-09-03T00:00:00.000Z", confirmedAt: "2026-09-03T00:00:00.000Z" }),
        ])} />);

        expect(secaoSeus().queryByRole("button", { name: "Confirmar recebimento" })).not.toBeInTheDocument();
    });

    it("não bloqueia o botão quando o devedor ainda não anexou o comprovante (RN-076) -- só mostra um aviso discreto", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMineReceiving: true, paidAt: null }),
        ])} />);

        expect(screen.getAllByText(/ainda não anexou o comprovante deste pagamento/).length).toBeGreaterThan(0);
        expect(secaoSeus().getByRole("button", { name: "Confirmar recebimento" })).toBeEnabled();
    });

    it("esconde as ações quando a residência está arquivada (D-05/RN-078), mas mantém os dados visíveis", () => {
        render(<AcertosDaCompetencia residencia={{ ...RESIDENCIA, isArchived: true }} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMineReceiving: true }),
        ])} />);

        expect(screen.queryByRole("button", { name: "Confirmar recebimento" })).not.toBeInTheDocument();
        expect(secaoSeus().getByText("Letícia Rocha → Gabriel Mizael")).toBeInTheDocument();
    });

    it("clicar no botão abre o modal nomeando o devedor e o valor, sem chamar a action antes da confirmação", async () => {
        const user = userEvent.setup();
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMineReceiving: true }),
        ])} />);

        await user.click(secaoSeus().getByRole("button", { name: "Confirmar recebimento" }));

        expect(screen.getByText(/Confirmar que você recebeu R\$ 219,10 de Letícia Rocha\? Isso não pode ser desfeito\./)).toBeInTheDocument();
        expect(mockConfirmarRecebimentoAction).not.toHaveBeenCalled();
    });

    it("ao confirmar no modal, chama a action com o settlementId da linha e atualiza a tela em sucesso", async () => {
        mockConfirmarRecebimentoAction.mockResolvedValue({ success: true, message: "Recebimento confirmado." });
        const user = userEvent.setup();
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ id: "s42", isMineReceiving: true }),
        ])} />);

        await user.click(secaoSeus().getByRole("button", { name: "Confirmar recebimento" }));
        // O modal repete o texto do gatilho -- pega o botão dentro do diálogo
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar recebimento" }));

        expect(mockConfirmarRecebimentoAction).toHaveBeenCalledWith("AB12CD", 8, 2026, "s42");
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("erro da API aparece pro usuário e não atualiza a tela", async () => {
        mockConfirmarRecebimentoAction.mockResolvedValue({ success: false, message: "Este acerto já foi liquidado" });
        const user = userEvent.setup();
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMineReceiving: true }),
        ])} />);

        await user.click(secaoSeus().getByRole("button", { name: "Confirmar recebimento" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar recebimento" }));

        expect(await screen.findByText("Este acerto já foi liquidado")).toBeInTheDocument();
        expect(mockRefresh).not.toHaveBeenCalled();
    });
});

describe("AcertosDaCompetencia -- dispensar acerto (F-18, owner-only)", () => {
    it("mostra o botão 'Dispensar' só para o owner -- pra quem não é, a seção inteira some", () => {
        const { rerender } = render(
            <AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase()])} />
        );
        expect(secaoTodos().getByRole("button", { name: "Dispensar" })).toBeInTheDocument();

        rerender(<AcertosDaCompetencia residencia={{ ...RESIDENCIA, isOwner: false }} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase()])} />);
        expect(screen.queryByRole("heading", { name: "Todos os acertos do mês" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Dispensar" })).not.toBeInTheDocument();
    });

    it("não mostra o botão quando a linha já está liquidada ou dispensada", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ status: "SETTLED", paidAt: "2026-09-03T00:00:00.000Z", confirmedAt: "2026-09-03T00:00:00.000Z" }),
        ])} />);

        expect(secaoTodos().queryByRole("button", { name: "Dispensar" })).not.toBeInTheDocument();
    });

    it("esconde o botão quando a residência está arquivada, mesmo para o owner", () => {
        render(<AcertosDaCompetencia residencia={{ ...RESIDENCIA, isArchived: true }} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase()])} />);

        expect(screen.queryByRole("button", { name: "Dispensar" })).not.toBeInTheDocument();
    });

    it("clicar em 'Dispensar' abre o DispensarAcertoModal com o par e o valor certos", async () => {
        const user = userEvent.setup();
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase()])} />);

        await user.click(secaoTodos().getByRole("button", { name: "Dispensar" }));

        const dialogo = within(screen.getByRole("dialog"));
        expect(dialogo.getByText("Dispensar acerto")).toBeInTheDocument();
        expect(dialogo.getByText(/Letícia Rocha → Gabriel Mizael/)).toBeInTheDocument();
    });
});

describe("AcertosDaCompetencia -- anexar comprovante (D-06/D-11/D-18, F-14)", () => {
    it("mostra o botão de anexar só para quem é payer da linha, e nunca pra quem é receiver", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ id: "sou-payer", isMinePaying: true }),
            acertoBase({ id: "sou-receiver", isMineReceiving: true }),
        ])} />);

        expect(secaoSeus().getAllByText("Anexar comprovante")).toHaveLength(1);
    });

    it("continua mostrando o botão mesmo depois do primeiro comprovante (D-11 -- N comprovantes por linha)", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMinePaying: true, paidAt: "2026-09-03T09:11:00.000Z" }),
        ])} />);

        expect(secaoSeus().getByText("Anexar comprovante")).toBeInTheDocument();
    });

    it("não mostra o botão quando a linha já está liquidada, dispensada, ou a residência está arquivada", () => {
        const { rerender } = render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMinePaying: true, status: "SETTLED", paidAt: "2026-09-03T00:00:00.000Z", confirmedAt: "2026-09-03T00:00:00.000Z" }),
        ])} />);
        expect(screen.queryByText("Anexar comprovante")).not.toBeInTheDocument();

        rerender(<AcertosDaCompetencia residencia={{ ...RESIDENCIA, isArchived: true }} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({ isMinePaying: true }),
        ])} />);
        expect(screen.queryByText("Anexar comprovante")).not.toBeInTheDocument();
    });

    it("mostra o aviso de indisponibilidade em vez do botão quando canUpload é false (D-18)", () => {
        const resumo = { ...resumoBase([acertoBase({ isMinePaying: true })]), canUpload: false };
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumo} />);

        expect(screen.queryByText("Anexar comprovante")).not.toBeInTheDocument();
        expect(screen.getAllByText("O envio de comprovantes está indisponível no momento. Tente mais tarde.").length).toBeGreaterThan(0);
    });
});

describe("AcertosDaCompetencia -- comprovantes (C.3/C.5, RN-080)", () => {
    it("mostra o nome de cada comprovante, visível mesmo pra quem não é payer nem receiver da linha (RN-080)", async () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([
            acertoBase({
                isMinePaying: false, isMineReceiving: false,
                receipts: [
                    { id: "c1", contentType: "image/webp", sizeInBytes: 1000, originalName: "nota.jpg", uploadedAt: "2026-09-03T00:00:00.000Z", uploadedByName: "Letícia Rocha" },
                ],
            }),
        ])} />);

        expect(await secaoTodos().findByText("nota.jpg")).toBeInTheDocument();
    });

    it("não mostra nada quando a linha não tem comprovante nenhum", () => {
        render(<AcertosDaCompetencia residencia={RESIDENCIA} competencias={COMPETENCIAS} resumo={resumoBase([acertoBase({ receipts: [] })])} />);

        expect(screen.queryByText("nota.jpg")).not.toBeInTheDocument();
        expect(screen.queryByText("Carregando comprovante...")).not.toBeInTheDocument();
    });
});
