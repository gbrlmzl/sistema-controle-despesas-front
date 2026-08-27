'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { periodoAAAAMM } from "@/utils/competencia";
import type { ActionState } from "@/types/actions";

//C.3 -> "Recebi o pagamento" de UM par específico -- POST sem corpo, sem
//anexo, no molde de fecharMesAction.ts (F-13). Irreversível na V1 (D-10): não
//há ação de desfazer. Só quem é receiverId daquela linha consegue confirmar
//(RN-075); a API garante isso e devolve 403/409 nos outros casos.
export default async function confirmarRecebimentoAction(code: string, month: number, year: number, settlementId: string): Promise<ActionState> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    const periodo = periodoAAAAMM({ month, year });

    try {
        await apiFetch(`/residences/${code}/closures/${periodo}/settlements/${settlementId}/confirm`, {
            method: "POST",
        });

        revalidatePath(`/dashboard/residences/${code}/settlements`);

        return {
            success: true,
            message: 'Recebimento confirmado.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao confirmar o recebimento. Tente novamente mais tarde.',
            success: false,
        }
    }
}
