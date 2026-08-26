'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { periodoAAAAMM } from "@/utils/competencia";
import type { ActionState } from "@/types/actions";

//D-07/RN-082 -> só o owner dispensa, com motivo de 3 a 200 caracteres. Dispensa
//a linha INTEIRA (os dois lados do par de uma vez), independente de qual
//carimbo estava faltando. F-18 -> molde de editarDespesaAction.ts (form-modal
//com useActionState), diferente de confirmarRecebimentoAction (sem formulário).
//A validação de tamanho do motivo é da API -- aqui só repassa a mensagem dela,
//o botão do modal já desabilita antes disso.
export default async function dispensarAcertoAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    const periodo = periodoAAAAMM({ month: Number(data.month), year: Number(data.year) });

    try {
        await apiFetch(`/residences/${data.code}/closures/${periodo}/settlements/${data.settlementId}/waive`, {
            method: "POST",
            body: { reason: data.reason },
        });

        revalidatePath(`/dashboard/residences/${data.code}/settlements`);

        return {
            success: true,
            message: 'Acerto dispensado.',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao dispensar o acerto. Tente novamente mais tarde.',
            success: false,
        }
    }
}
