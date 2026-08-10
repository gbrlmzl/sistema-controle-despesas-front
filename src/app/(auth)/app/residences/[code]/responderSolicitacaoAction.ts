'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function responderSolicitacaoAction(code: string, requestId: number, aceitar: boolean): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Responde via API — ela já garante que só o owner responde (RN-017/CA-5),
    //que residência arquivada congela novas entradas (Q-11), cria o vínculo ao
    //aceitar (CA-2) e notifica o solicitante da decisão (CA-3/CA-4).
    try {
        const { requesterName, accepted } = await apiFetch<{ requesterName: string; accepted: boolean }>(`/residences/join-requests/${requestId}`, {
            method: "PATCH",
            body: { status: aceitar ? "accepted" : "declined" },
        });

        revalidatePath(`/app/residences/${code}`);

        return {
            success: true,
            message: accepted ? `${requesterName} agora é membro da residência.` : `Solicitação de ${requesterName} recusada.`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao responder a solicitação. Tente novamente mais tarde.',
            success: false,
        }
    }
}
