'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { despesaSchema } from "@/schemas/despesas";
import { parseValorParaCentavos } from "@/utils/dinheiro";
import { competenciaTexto } from "@/utils/categorias";
import type { ActionState } from "@/types/actions";



export default async function cadastrarDespesaAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> O valor é convertido antes da validação, porque depende do formato digitado
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

    // 3 -> Lança a despesa via API — ela já garante que só membro lança (RN-018),
    //que residência arquivada não aceita novos lançamentos (Q-9) e que a despesa
    //cai sempre na competência aberta (RN-020).
    try {
        const { expense } = await apiFetch<{ expense: { month: number; year: number } }>(`/residences/${data.code}/expenses`, {
            method: "POST",
            body: payload,
        });

        revalidatePath(`/app/residences/${data.code}/expenses`);
        revalidatePath(`/app/residences/${data.code}/expenses/recurring`);

        return {
            success: true,
            message: `Despesa lançada em ${competenciaTexto(expense.month, expense.year)}!`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao cadastrar a despesa. Tente novamente mais tarde.',
            success: false,
        }
    }
}
