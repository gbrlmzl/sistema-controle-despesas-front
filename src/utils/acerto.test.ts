import { descricaoSelo, resumoMeusAcertos } from "./acerto";
import { formatarValor } from "./dinheiro";
import type { AcertosDaCompetencia, MeuAcerto } from "@/types/acerto";

describe("descricaoSelo", () => {
    it("não mostra selo quando a competência está aberta", () => {
        expect(descricaoSelo(false, null)).toBeNull();
    });

    it("mostra 'fechado' em tom neutro quando não há settlement (legado ou sem linhas)", () => {
        expect(descricaoSelo(true, null)).toEqual({ texto: "fechado", tom: "neutro" });
    });

    it("mostra 'aguardando pagamento' com a contagem do lado payer", () => {
        const settlement: AcertosDaCompetencia = {
            status: "AWAITING_PAYMENT",
            totals: { payerSide: { lines: 2, paid: 1 }, receiverSide: { lines: 2, confirmed: 0 } },
            mine: [],
        };

        expect(descricaoSelo(true, settlement)).toEqual({
            texto: "aguardando pagamento · 1 de 2",
            tom: "atencaoPagamento",
        });
    });

    it("mostra 'aguardando confirmação' com a contagem do lado receiver, em tom distinto", () => {
        const settlement: AcertosDaCompetencia = {
            status: "AWAITING_CONFIRMATION",
            totals: { payerSide: { lines: 2, paid: 2 }, receiverSide: { lines: 2, confirmed: 1 } },
            mine: [],
        };

        expect(descricaoSelo(true, settlement)).toEqual({
            texto: "aguardando confirmação · 1 de 2",
            tom: "atencaoConfirmacao",
        });
    });

    it("mostra 'mês quitado' em tom positivo", () => {
        const settlement: AcertosDaCompetencia = {
            status: "SETTLED",
            totals: { payerSide: { lines: 2, paid: 2 }, receiverSide: { lines: 2, confirmed: 2 } },
            mine: [],
        };

        expect(descricaoSelo(true, settlement)).toEqual({ texto: "mês quitado", tom: "positivo" });
    });
});

describe("resumoMeusAcertos", () => {
    it("retorna null quando não há nenhuma linha pendente", () => {
        const mine: MeuAcerto[] = [
            { id: "s1", role: "PAYER", counterpartyName: "Ana Prado", amountInCents: 10000, status: "SETTLED" },
        ];

        expect(resumoMeusAcertos(mine)).toBeNull();
    });

    it("soma as linhas PENDING do lado payer e ignora as já anexadas ou quitadas", () => {
        const mine: MeuAcerto[] = [
            { id: "s1", role: "PAYER", counterpartyName: "Gabriel Mizael", amountInCents: 21910, status: "PENDING" },
            { id: "s2", role: "PAYER", counterpartyName: "Ana Prado", amountInCents: 10762, status: "PENDING" },
            { id: "s3", role: "PAYER", counterpartyName: "Bruno Alves", amountInCents: 5000, status: "AWAITING_CONFIRMATION" },
        ];

        expect(resumoMeusAcertos(mine)).toEqual({
            texto: `Você deve ${formatarValor(32672)}, em 2 pagamentos`,
            quantidade: 2,
        });
    });

    it("soma as linhas PENDING do lado receiver, no singular quando é uma só", () => {
        const mine: MeuAcerto[] = [
            { id: "s1", role: "RECEIVER", counterpartyName: "Letícia Rocha", amountInCents: 21910, status: "PENDING" },
        ];

        expect(resumoMeusAcertos(mine)).toEqual({
            texto: `Você tem ${formatarValor(21910)} a receber, de 1 pessoa`,
            quantidade: 1,
        });
    });

    it("nunca mistura payer e receiver -- usa o papel do primeiro item pendente", () => {
        // Cenário hipotético de teste (D-29 garante que isso não acontece na prática):
        // o helper ainda precisa de um comportamento previsível se a API um dia divergir.
        const mine: MeuAcerto[] = [
            { id: "s1", role: "PAYER", counterpartyName: "Gabriel Mizael", amountInCents: 1000, status: "PENDING" },
            { id: "s2", role: "RECEIVER", counterpartyName: "Ana Prado", amountInCents: 2000, status: "PENDING" },
        ];

        const resultado = resumoMeusAcertos(mine);
        expect(resultado?.texto).toContain("Você deve");
    });
});
