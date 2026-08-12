'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { competenciaTexto } from "@/utils/categorias";
import type { ActionState } from "@/types/actions";



export default async function reabrirMesAction(code: string, month: number, year: number): Promise<ActionState> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Reabre via API — ela já garante que só o owner reabre, que residência
    //arquivada é somente leitura e que só o fechamento mais recente pode ser
    //desfeito (evita abrir buracos na sequência de meses fechados).
    const periodo = `${year}-${String(month).padStart(2, '0')}`;

    try {
        await apiFetch(`/residences/${code}/expenses/month-closures/${periodo}`, {
            method: "DELETE",
        });

        revalidatePath(`/dashboard/residences/${code}/expenses`);

        return {
            success: true,
            message: `Mês de ${competenciaTexto(month, year)} reaberto.`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao reabrir o mês. Tente novamente mais tarde.',
            success: false,
        }
    }
}
