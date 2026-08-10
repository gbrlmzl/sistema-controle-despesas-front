import { apiFetch, ApiError } from "./apiClient";
import type { Residencia, SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

export interface ResidenceDetail {
    residence: Residencia;
    sentInvites: ConviteEnviado[];
    pendingJoinRequests: SolicitacaoPendente[];
}

//RN-010 -> quem não é membro recebe o mesmo resultado de residência inexistente
//(a API já devolve 404 nos dois casos, sem distinguir).
export async function getResidenceDetail(code: string): Promise<ResidenceDetail | null> {
    try {
        return await apiFetch<ResidenceDetail>(`/residences/${code}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}
