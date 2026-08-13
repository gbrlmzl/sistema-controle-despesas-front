'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function excluirDespesaAction(code: string, expenseId: string): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Exclui via API (exclusão lógica) — ela já garante que só o autor exclui
    //a própria despesa (Q-5), que residência arquivada é somente leitura e que mês
    //fechado fica congelado.
    try {
        await apiFetch(`/residences/${code}/expenses/${expenseId}`, {
            method: "DELETE",
        });

        revalidatePath(`/dashboard/residences/${code}/expenses`);

        return {
            success: true,
            message: 'Despesa excluída.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao excluir a despesa. Tente novamente mais tarde.',
            success: false,
        }
    }
}
