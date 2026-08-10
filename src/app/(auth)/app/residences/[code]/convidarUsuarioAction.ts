'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function convidarUsuarioAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    const username = data.username?.trim().toLowerCase() ?? "";

    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Se não tiver nome de usuário, retorna erro
    if (!username) {
        return {
            message: 'Informe o nome de usuário',
            success: false,
        }
    }

    // 3 -> Convida via API — ela já garante que só o owner convida (RN-014), que
    //residência arquivada congela novas entradas (Q-11), que o usuário existe
    //(CA-4), que não é convite duplicado/membro já existente (CA-5/CA-6) e
    //notifica o convidado.
    try {
        const { invitedUserName } = await apiFetch<{ invitedUserName: string }>(`/residences/${data.code}/invites`, {
            method: "POST",
            body: { username },
        });

        revalidatePath(`/app/residences/${data.code}`);

        return {
            success: true,
            message: `Convite enviado para ${invitedUserName}!`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao enviar o convite. Tente novamente mais tarde.',
            success: false,
        }
    }
}
