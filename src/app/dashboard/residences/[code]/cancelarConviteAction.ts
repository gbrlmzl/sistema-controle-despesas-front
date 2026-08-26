'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function cancelarConviteAction(code: string, inviteId: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Cancela via API — ela já garante que só o owner cancela (RN-042/CA-7) e
    //que só é possível enquanto o convite estiver pendente (RN-043).
    try {
        const { invitedUserName } = await apiFetch<{ invitedUserName: string }>(`/residences/invites/${inviteId}`, {
            method: "DELETE",
        });

        revalidatePath(`/dashboard/residences/${code}/members/requests`);
        revalidatePath(`/dashboard/residences/${code}/members`);

        return {
            success: true,
            message: `Convite para ${invitedUserName} cancelado.`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao cancelar o convite. Tente novamente mais tarde.',
            success: false,
        }
    }
}
