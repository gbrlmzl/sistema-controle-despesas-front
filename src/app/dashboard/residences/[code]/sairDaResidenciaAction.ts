'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function sairDaResidenciaAction(code: string): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Sai da residência via API — ela já impede o owner de sair sem antes
    //transferir a propriedade (RN-021) e já leva os lançamentos da competência
    //aberta junto (RN-022).
    try {
        await apiFetch(`/residences/${code}/members/me`, {
            method: "DELETE",
        });

        revalidatePath('/app/residences');

        return {
            success: true,
            message: 'Você saiu da residência.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao sair da residência. Tente novamente mais tarde.',
            success: false,
        }
    }
}
