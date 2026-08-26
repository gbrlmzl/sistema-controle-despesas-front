import { formatarValor } from "./dinheiro";
import type { AcertosDaCompetencia, MeuAcerto } from "@/types/acerto";

export type TomSelo = 'neutro' | 'atencaoPagamento' | 'atencaoConfirmacao' | 'positivo';

export interface SeloAcerto {
    texto: string;
    tom: TomSelo;
}

//C.1 do plano de arquitetura -- quatro estados do selo da competência, alimentados
//pelo bloco settlement de GET /expenses, sem requisição extra. "neutro" é o
//fechamento sem nada a acertar (legado ou sem linhas, D-09) -- distinto de
//"atenção", que é quando alguém (você ou outra pessoa) ainda tem uma ação
//pendente. As duas variantes de atenção têm tom próprio porque significam coisas
//diferentes: uma pede ação de quem paga, a outra de quem recebe.
//Vive num único lugar (F-19) porque o painel, a tela de despesas e a tela de
//acertos precisam do mesmo texto -- duplicar essa cadeia de `if` em três
//componentes é como uma delas ficaria desatualizada sem ninguém notar.
export function descricaoSelo(isClosed: boolean, settlement: AcertosDaCompetencia | null): SeloAcerto | null {
    if (!isClosed) {
        return null;
    }

    if (!settlement) {
        return { texto: 'fechado', tom: 'neutro' };
    }

    if (settlement.status === 'SETTLED') {
        return { texto: 'mês quitado', tom: 'positivo' };
    }

    if (settlement.status === 'AWAITING_PAYMENT') {
        const { paid, lines } = settlement.totals.payerSide;
        return { texto: `aguardando pagamento · ${paid} de ${lines}`, tom: 'atencaoPagamento' };
    }

    const { confirmed, lines } = settlement.totals.receiverSide;
    return { texto: `aguardando confirmação · ${confirmed} de ${lines}`, tom: 'atencaoConfirmacao' };
}

export interface ChamadaMeusAcertos {
    texto: string;
    quantidade: number;
}

//C.1 -- o CTA de saldo só aparece quando sobra alguma linha "PENDING" (a que
//ainda não foi tocada por ninguém). Uma linha AWAITING_CONFIRMATION do lado
//PAYER já teve o comprovante anexado -- contá-la em "você deve" enganaria quem
//já pagou; do lado RECEIVER ela só deixa de aparecer aqui porque a tela de
//acertos (C.2) é o lugar certo pra decidir se confirma antes do payer terminar
//(RN-076), não o card de saldo do painel.
//Uma pessoa nunca mistura PAYER e RECEIVER na mesma competência (D-29 opera
//sobre o saldo líquido, que já tem um sinal só) -- então o papel do primeiro
//item pendente já vale para todos.
export function resumoMeusAcertos(mine: MeuAcerto[]): ChamadaMeusAcertos | null {
    const pendentes = mine.filter(item => item.status === 'PENDING');
    if (pendentes.length === 0) {
        return null;
    }

    const total = pendentes.reduce((soma, item) => soma + item.amountInCents, 0);
    const papel = pendentes[0].role;
    const quantidade = pendentes.length;

    const texto = papel === 'PAYER'
        ? `Você deve ${formatarValor(total)}, em ${quantidade} pagamento${quantidade > 1 ? 's' : ''}`
        : `Você tem ${formatarValor(total)} a receber, de ${quantidade} pessoa${quantidade > 1 ? 's' : ''}`;

    return { texto, quantidade };
}
