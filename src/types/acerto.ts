//FEAT-036 a FEAT-038 -> tipos do acerto de pagamentos entre membros da residência.
//"Acerto" é a tradução de Settlement (D-20 do plano de arquitetura): uma linha por
//PAR devedor→credor, nunca por pessoa (D-01/D-29) — quem deve para duas pessoas
//aparece em duas linhas, separadamente.
export type StatusAcerto = 'PENDING' | 'AWAITING_CONFIRMATION' | 'SETTLED' | 'WAIVED';
export type StatusFechamento = 'AWAITING_PAYMENT' | 'AWAITING_CONFIRMATION' | 'SETTLED';

export interface ComprovantePagamento {
    id: string;
    contentType: string;
    sizeInBytes: number;
    originalName: string | null;
    uploadedAt: string;
    uploadedByName: string;
}

//O item de settlement.mine em GET /expenses (§6.7) -- "meu lado" num acerto,
//derivado comparando o par com o usuário logado. Nunca PAYER e RECEIVER ao mesmo
//tempo na mesma competência (D-29 opera sobre o saldo líquido, que já tem um sinal só).
export interface MeuAcerto {
    id: string;
    role: 'PAYER' | 'RECEIVER';
    counterpartyName: string;
    amountInCents: number;
    status: StatusAcerto;
}

export interface TotaisAcerto {
    payerSide: { lines: number; paid: number };
    receiverSide: { lines: number; confirmed: number };
}

//O bloco settlement embutido em GET /expenses -- null quando a competência está
//aberta ou quando o fechamento não tem linhas (fechamento legado, D-09).
export interface AcertosDaCompetencia {
    status: StatusFechamento;
    totals: TotaisAcerto;
    mine: MeuAcerto[];
}

//Uma linha (par) da tela de acertos -- GET .../closures/:period/settlements.
export interface Acerto {
    id: string;
    payer: { userId: number; name: string };
    receiver: { userId: number; name: string };
    amountInCents: number;
    isMinePaying: boolean;
    isMineReceiving: boolean;
    status: StatusAcerto;
    paidAt: string | null;
    confirmedAt: string | null;
    waivedAt: string | null;
    waiveReason: string | null;
    receipts: ComprovantePagamento[];
}

export interface ResumoAcertos {
    competencia: { month: number; year: number };
    closedAt: string;
    closedByName: string;
    status: StatusFechamento;
    settledAt: string | null;
    totals: TotaisAcerto;
    canAct: boolean;
    canUpload: boolean;
    acertos: Acerto[];
}
