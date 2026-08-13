'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function arquivarResidenciaAction(code: string, arquivar: boolean): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Arquiva/desarquiva via API — ela já garante que só o owner faz isso
    //(Q-12/RN-033) e evita gravar um estado que já é o atual.
    try {
        await apiFetch(`/residences/${code}`, {
            method: "PATCH",
            body: { archived: arquivar },
        });

        revalidatePath(`/dashboard/residences/${code}`);
        revalidatePath('/app/residences');

        return {
            success: true,
            message: arquivar ? 'Residência arquivada.' : 'Residência desarquivada.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao arquivar a residência. Tente novamente mais tarde.',
            success: false,
        }
    }
}
