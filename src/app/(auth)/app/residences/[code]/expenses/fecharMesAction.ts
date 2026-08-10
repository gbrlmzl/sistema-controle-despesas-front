'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { competenciaTexto } from "@/utils/categorias";
import type { ActionState } from "@/types/actions";

//Mesma regra de virada de competência usada pelo lado da API — pura, sem estado.
function competenciaSeguinte(month: number, year: number): { month: number; year: number } {
    return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

export default async function fecharMesAction(code: string, month: number, year: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Fecha o mês via API — ela já garante que só o owner fecha, que residência
    //arquivada é somente leitura, que só a competência aberta pode ser fechada,
    //recria as despesas recorrentes na competência seguinte (FEAT-025) e notifica
    //todos os membros (MONTH_CLOSED).
    try {
        const { closure, recurringExpensesGenerated } = await apiFetch<{
            closure: { month: number; year: number };
            recurringExpensesGenerated: number;
        }>(`/residences/${code}/expenses/month-closures`, {
            method: "POST",
            body: { month, year },
        });

        revalidatePath(`/app/residences/${code}/expenses`);

        const proxima = competenciaSeguinte(closure.month, closure.year);
        const complemento = recurringExpensesGenerated > 0
            ? ` ${recurringExpensesGenerated} despesa(s) recorrente(s) foram lançadas em ${competenciaTexto(proxima.month, proxima.year)}.`
            : '';

        return {
            success: true,
            message: `Mês de ${competenciaTexto(closure.month, closure.year)} fechado.${complemento}`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao fechar o mês. Tente novamente mais tarde.',
            success: false,
        }
    }
}
