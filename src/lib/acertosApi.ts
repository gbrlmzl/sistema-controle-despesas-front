import { apiFetch, ApiError } from "./apiClient";
import { periodoAAAAMM } from "@/utils/competencia";
import type { Competencia } from "@/types/competencia";
import type { Acerto, ResumoAcertos, StatusAcerto, StatusFechamento, ComprovantePagamento } from "@/types/acerto";

interface SettlementsApiResponse {
    competency: Competencia;
    closedAt: string;
    closedByName: string;
    status: StatusFechamento;
    settledAt: string | null;
    totals: {
        payerSide: { lines: number; paid: number };
        receiverSide: { lines: number; confirmed: number };
    };
    canAct: boolean;
    canUpload: boolean;
    settlements: {
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
    }[];
}

//GET /residences/:code/closures/:period/settlements (§6.1) -- os pares
//devedor->credor de uma competência fechada (D-01/D-29). 404 quando não é
//membro ou o período não tem fechamento (RN-080/competência aberta) -- mesmo
//padrão de getResidenceDetail: devolve null em vez de propagar, a página trata
//como notFound(). A API devolve settlements: [] pra fechamento legado sem
//linhas (D-09), nunca 404 nesse caso.
export async function getClosureSettlements(code: string, competencia: Competencia): Promise<ResumoAcertos | null> {
    const periodo = periodoAAAAMM(competencia);

    let data: SettlementsApiResponse;
    try {
        data = await apiFetch<SettlementsApiResponse>(`/residences/${code}/closures/${periodo}/settlements`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }

    const acertos: Acerto[] = data.settlements.map(item => ({
        id: item.id,
        payer: item.payer,
        receiver: item.receiver,
        amountInCents: item.amountInCents,
        isMinePaying: item.isMinePaying,
        isMineReceiving: item.isMineReceiving,
        status: item.status,
        paidAt: item.paidAt,
        confirmedAt: item.confirmedAt,
        waivedAt: item.waivedAt,
        waiveReason: item.waiveReason,
        receipts: item.receipts,
    }));

    return {
        competencia: data.competency,
        closedAt: data.closedAt,
        closedByName: data.closedByName,
        status: data.status,
        settledAt: data.settledAt,
        totals: data.totals,
        canAct: data.canAct,
        canUpload: data.canUpload,
        acertos,
    };
}
