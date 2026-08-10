'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { despesaSchema } from "@/schemas/despesas";
import { parseValorParaCentavos } from "@/utils/dinheiro";
import type { ActionState } from "@/types/actions";



export default async function editarDespesaAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Valida os novos dados
    const valueInCents = parseValorParaCentavos(data.value);

    if (valueInCents === null) {
        return {
            message: 'Informe um valor válido, como 180,50',
            success: false,
        }
    }

    const parseResult = despesaSchema.safeParse({
        name: data.name,
        valueInCents: valueInCents,
        category: data.category,
        isRecurring: data.isRecurring === 'on',
    });

    if (!parseResult.success) {
        const firstError = parseResult.error.issues[0];
        return {
            message: firstError.message,
            success: false,
        }
    }

    const payload = parseResult.data;

    // 3 -> Edita via API — ela já garante que só o autor edita a própria despesa
    //(Q-5), que residência arquivada é somente leitura e que mês fechado fica
    //congelado. A competência não muda: editar corrige o lançamento, não o move de mês.
    try {
        await apiFetch(`/residences/${data.code}/expenses/${data.expenseId}`, {
            method: "PATCH",
            body: payload,
        });

        revalidatePath(`/app/residences/${data.code}/expenses`);
        revalidatePath(`/app/residences/${data.code}/expenses/recurring`);

        return {
            success: true,
            message: 'Despesa atualizada!',
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
