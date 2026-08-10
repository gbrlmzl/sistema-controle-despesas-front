'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { getCurrentUser } from "@/lib/session";
import { entrarResidenciaSchema } from "@/schemas/residencias";
import { normalizeResidenceCode } from "@/lib/residenceCode";
import type { ActionState } from "@/types/actions";

//RN-050 -> a resposta a um código que não leva a lugar nenhum é sempre a mesma,
//exista a residência ou não. É o que impede descobrir residências testando códigos.
const MENSAGEM_NAO_ENCONTRADA = 'Nenhuma residência foi encontrada com esse código';


export default async function entrarResidenciaAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    //RN-012 -> tolera espaços nas pontas e diferença de maiúsculas/minúsculas
    data.code = normalizeResidenceCode(data.code);

    // 1 -> Verifica se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
        return {
            message: 'Usuário não autenticado',
            success: false,
        }
    }

    // 2 -> Se não tiver código, retorna erro
    if (!data.code) {
        return {
            message: 'Informe o código da residência',
            success: false,
        }
    }

    // 3 -> Valida o formato do código
    const parseResult = entrarResidenciaSchema.safeParse(data);
    if (!parseResult.success) {
        return {
            message: MENSAGEM_NAO_ENCONTRADA,
            success: false,
        }
    }

    const payload = parseResult.data;

    // 4 -> Envia a solicitação de entrada via API — ela já cobre rate-limit (FEAT-020),
    //já-é-membro (CA-5), solicitação duplicada (CA-6) e recusa recente (RN-013).
    try {
        const { residenceName } = await apiFetch<{ residenceName: string }>("/residences/join-requests", {
            method: "POST",
            body: { code: payload.code },
        });

        return {
            success: true,
            message: `Solicitação enviada! Aguarde a resposta do criador da residência "${residenceName}".`,
        }
    }
    catch (error) {
        if (error instanceof ApiError) {
            return { message: error.status === 404 ? MENSAGEM_NAO_ENCONTRADA : error.message, success: false };
        }
        return {
            message: 'Erro ao enviar a solicitação. Tente novamente mais tarde.',
            success: false,
        }
    }
}
