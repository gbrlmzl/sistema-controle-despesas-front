'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/types/actions";



export default async function regenerarCodigoAction(code: string): Promise<ActionState<{ code: string }>> {
    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Regenera o código via API — ela já garante que só o owner regenera
    //(RN-045/CA-8), que residência arquivada é somente leitura (CA-9), e cancela
    //as solicitações pendentes do código antigo (RN-048).
    try {
        const { code: novoCodigo } = await apiFetch<{ code: string }>(`/residences/${code}/code`, {
            method: "POST",
        });

        revalidatePath('/app/residences');

        //A rota é identificada pelo código (RN-009), então quem chamou precisa
        //redirecionar para a nova URL — a antiga deixou de existir.
        return {
            success: true,
            message: 'Novo código gerado!',
            data: { code: novoCodigo },
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao gerar um novo código. Tente novamente mais tarde.',
            success: false,
        }
    }
}
