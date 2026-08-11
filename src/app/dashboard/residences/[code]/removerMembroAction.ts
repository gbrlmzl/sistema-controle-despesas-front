'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function removerMembroAction(code: string, membroUserId: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Remove o membro via API — ela já garante que só o owner remove (RN-024),
    //que residência arquivada é somente leitura (RN-032), que o owner não remove a
    //si mesmo (CA-5), notifica o removido (CA-7) e leva os lançamentos da
    //competência aberta junto (RN-026).
    try {
        await apiFetch(`/residences/${code}/members/${membroUserId}`, {
            method: "DELETE",
        });

        revalidatePath(`/app/residences/${code}`);
        revalidatePath('/app/residences');

        return {
            success: true,
            message: 'Membro removido da residência.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao remover o membro. Tente novamente mais tarde.',
            success: false,
        }
    }
}
