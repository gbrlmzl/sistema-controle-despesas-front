'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { criarResidenciaSchema } from "@/schemas/residencias";
import type { ActionState } from "@/types/actions";



export default async function criarResidenciaAction(_prevState: ActionState<{ name: string; code: string }> | null, formData: FormData): Promise<ActionState<{ name: string; code: string }>> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Se não tiver nome, retorna erro
    if (!data.name) {
        return {
            message: 'Informe o nome da residência',
            success: false,
        }
    }

    // 3 -> Valida os dados do formulário usando o schema do Zod
    const parseResult = criarResidenciaSchema.safeParse(data);
    if (!parseResult.success) {
        const firstError = parseResult.error.issues[0];
        return {
            message: firstError.message,
            success: false,
        }
    }

    //4 -> O formato dos dados está válido, extrai os dados validados
    const payload = parseResult.data;

    //5 -> Cria a residência via API — o vínculo do criador como OWNER já é feito
    //do lado da API, na mesma operação.
    try {
        const { residence } = await apiFetch<{ residence: { name: string; code: string } }>("/residences", {
            method: "POST",
            body: { name: payload.name },
        });

        return {
            success: true,
            message: 'Residência criada com sucesso!',
            data: residence,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao criar residência. Tente novamente mais tarde.',
            success: false,
        }
    }
}
