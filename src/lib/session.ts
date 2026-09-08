import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { apiFetch, ApiError } from "./apiClient";
import type { AuthUser } from "@/types/auth";

//Substitui o antigo auth() do NextAuth: não existe mais um objeto de sessão local,
//"quem está logado" é sempre resposta de uma chamada à API. Roda em toda página (a
//partir do layout raiz), então qualquer falha aqui — 401 (sessão ausente/expirada) ou
//a API estar fora do ar/lenta — precisa cair para "deslogado" em vez de derrubar a
//aplicação inteira. Falhas inesperadas (não-401) ainda são logadas, só não propagam.
//
//cache() do React memoiza por requisição: o layout raiz (via getSessionPromise) e a
//própria página (várias chamam getCurrentUser() direto — ver expenses/page.tsx,
//settlements/page.tsx, [code]/page.tsx) pedem a sessão cada um pelo seu motivo, mas
//dentro da MESMA renderização isso virava dois GET /users/me em vez de um. Fora de
//uma renderização de servidor (uma Server Action chamada isolada, um teste) não há
//nada prévio pra reaproveitar, então o comportamento não muda — só deixa de duplicar
//quando mais de uma parte da árvore pede a mesma coisa na mesma passada.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
    try {
        //Um 401 aqui já significa sessão encerrada: o proxy.ts roda antes deste render e
        //é quem tenta renovar (ver o comentário em apiClient.ts sobre por que renovar
        //durante o render queimava o refresh token em vez de recuperá-lo).
        const { user } = await apiFetch<{ user: AuthUser }>("/users/me");
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
});

/**
 * A mesma sessão, mas para ser passada SEM await a um Client Component que a
 * consome com use() — hoje o UserProvider, a partir do layout raiz.
 *
 * O `.catch` vazio existe só para o runtime: uma promise que ninguém aguardou
 * ainda e que rejeita conta como unhandled rejection no Node, e o Next derruba o
 * processo em produção nesse caso. Anexar um handler marca a promise como
 * tratada; devolvemos a promise ORIGINAL (não a que .catch() cria), então quem
 * chama use() continua recebendo a rejeição e o Error Boundary segue funcionando.
 *
 * Na prática getCurrentUser() já não rejeita por falha de API — ela devolve null.
 * O que pode escapar são os erros de controle de fluxo do próprio Next
 * (unstable_rethrow), e esses devem mesmo propagar.
 */
export function getSessionPromise(): Promise<AuthUser | null> {
    const sessao = getCurrentUser();
    sessao.catch(() => { });
    return sessao;
}
