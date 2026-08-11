'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { criarResidenciaSchema } from "@/schemas/residencias";
import type { ActionState } from "@/types/actions";



export default async function renomearResidenciaAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
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

    // 3 -> CA-3: o novo nome passa pelas mesmas validações da criação (RN-003)
    const parseResult = criarResidenciaSchema.safeParse(data);
    if (!parseResult.success) {
        const firstError = parseResult.error.issues[0];
        return {
            message: firstError.message,
            success: false,
        }
    }

    const payload = parseResult.data;

    // 4 -> Renomeia via API — ela já garante que só o owner renomeia (RN-031) e que
    //residência arquivada é somente leitura (RN-032). O code permanece o mesmo.
    try {
        await apiFetch(`/residences/${data.code}`, {
            method: "PATCH",
            body: { name: payload.name },
        });

        revalidatePath(`/app/residences/${data.code}`);
        revalidatePath('/app/residences');

        return {
            success: true,
            message: 'Nome da residência atualizado!',
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.message, success: false };
        }
        return {
            message: 'Erro ao renomear a residência. Tente novamente mais tarde.',
            success: false,
        }
    }
}
