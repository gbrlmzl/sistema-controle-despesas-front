import { unstable_rethrow } from "next/navigation";
import { apiFetch, ApiError } from "./apiClient";
import type { AuthUser } from "@/types/auth";

//Substitui o antigo auth() do NextAuth: não existe mais um objeto de sessão local,
//"quem está logado" é sempre resposta de uma chamada à API. Roda em toda página (a
//partir do layout raiz), então qualquer falha aqui — 401 (sessão ausente/expirada) ou
//a API estar fora do ar/lenta — precisa cair para "deslogado" em vez de derrubar a
//aplicação inteira. Falhas inesperadas (não-401) ainda são logadas, só não propagam.
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const { user } = await apiFetch<{ user: AuthUser }>("/users/me", { skipAuthRetry: false });
        return user;
    } catch (error) {
        //Erros internos do Next.js (redirect(), notFound(), a marcação de rota
        //dinâmica por causa do cookies() usado aqui dentro) usam throw como controle
        //de fluxo e precisam continuar propagando — não são falha nenhuma da API.
        unstable_rethrow(error);

        if (!(error instanceof ApiError && error.status === 401)) {
            console.error("getCurrentUser: falha ao consultar a sessão", error);
        }
        return null;
    }
}
