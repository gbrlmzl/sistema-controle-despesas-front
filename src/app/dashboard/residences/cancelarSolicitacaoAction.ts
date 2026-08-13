'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function cancelarSolicitacaoAction(requestId: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Cancela a solicitação via API — ela já garante que só o próprio
    //solicitante cancela (RN-042) e só enquanto pendente (RN-043).
    try {
        const { residenceName } = await apiFetch<{ residenceName: string }>(`/residences/join-requests/${requestId}`, {
            method: "DELETE",
        });

        revalidatePath('/app/residences');

        return {
            success: true,
            message: `Solicitação para "${residenceName}" cancelada.`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao cancelar a solicitação. Tente novamente mais tarde.',
            success: false,
        }
    }
}
