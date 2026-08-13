'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



//"Excluir" nesta tela não remove o lançamento do mês atual, só impede que ele seja
//recopiado no fechamento seguinte (FEAT-025) — a despesa continua valendo e
//aparece normalmente em Consultar Despesas para quem quiser editá-la ou excluí-la.
export default async function pararRecorrenciaAction(code: string, expenseId: string): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Para via API — ela já garante que só o autor altera a própria despesa,
    //que residência arquivada é somente leitura e que mês fechado fica congelado.
    try {
        await apiFetch(`/residences/${code}/expenses/${expenseId}/recurrence`, {
            method: "DELETE",
        });

        revalidatePath(`/dashboard/residences/${code}/expenses/recurring`);
        revalidatePath(`/dashboard/residences/${code}/expenses`);

        return {
            success: true,
            message: 'A despesa não será mais repetida automaticamente.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao atualizar a despesa. Tente novamente mais tarde.',
            success: false,
        }
    }
}
