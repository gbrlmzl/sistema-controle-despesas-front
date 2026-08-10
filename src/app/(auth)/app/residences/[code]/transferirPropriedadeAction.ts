'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function transferirPropriedadeAction(code: string, novoOwnerUserId: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Transfere via API — ela já garante que só o owner transfere (CA-6), que
    //residência arquivada é somente leitura (RN-032), que não transfere para si
    //mesmo, que o destino precisa ser membro (RN-027) e notifica o novo owner (CA-7).
    try {
        await apiFetch(`/residences/${code}/owner`, {
            method: "PUT",
            body: { userId: novoOwnerUserId },
        });

        revalidatePath(`/app/residences/${code}`);
        revalidatePath('/app/residences');

        return {
            success: true,
            message: 'Propriedade da residência transferida.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao transferir a propriedade. Tente novamente mais tarde.',
            success: false,
        }
    }
}
