'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function responderConviteAction(inviteId: number, aceitar: boolean): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Responde o convite via API — ela já cobre convite vencido/indisponível
    //(CA-4), residência arquivada (Q-11) e cria o vínculo ao aceitar (RN-016).
    try {
        const { residenceName, joined } = await apiFetch<{ residenceName: string; joined: boolean }>(`/residences/invites/${inviteId}`, {
            method: "PATCH",
            body: { status: aceitar ? "accepted" : "declined" },
        });

        revalidatePath('/app/residences');

        return {
            success: true,
            message: joined ? `Você entrou na residência "${residenceName}"!` : 'Convite recusado.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao responder o convite. Tente novamente mais tarde.',
            success: false,
        }
    }
}
