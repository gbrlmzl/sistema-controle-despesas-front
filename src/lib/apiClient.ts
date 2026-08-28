//Server-only: importa next/headers, que quebra o build se acabar puxado por um
//Client Component. Não deve ser importado fora de Server Actions/Components.
import { cookies } from "next/headers";
import { ApiError, parseApiResponse } from "./apiError";
import { parseSetCookie } from "./setCookie";

const API_URL = process.env.API_URL;

if (!API_URL) {
    throw new Error("Variável de ambiente API_URL não configurada.");
}

//Sem timeout, uma API travada (não só fora do ar) deixaria a renderização da
//página pendurada indefinidamente — nenhum fetch aqui tem limite de tempo por padrão.
const TIMEOUT_MS = 10_000;

export interface ApiFetchOptions {
    method?: string;
    body?: unknown;
}

//Repassa os cookies recebidos do navegador pra API — fetch() do lado do servidor
//Next.js não faz isso sozinho quando o destino é uma origem diferente.
async function cookieHeader(): Promise<string> {
    const cookieStore = await cookies();
    return cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
}

//Um Set-Cookie da API vira um cookie no navegador só se a gente o repetir aqui. Vale
//pros endpoints que reabrem a sessão (troca de senha, por exemplo) quando chamados de
//uma Server Action. Fora de Server Action/Route Handler (ex.: getCurrentUser rodando
//durante o render de um Server Component), o Next.js proíbe escrever cookie e
//cookieStore.set() lança — aí só falha graciosamente em vez de derrubar a página.
function applySetCookies(rawSetCookies: string[], cookieStore: Awaited<ReturnType<typeof cookies>>): void {
    try {
        for (const raw of rawSetCookies) {
            const { name, value, options } = parseSetCookie(raw);
            cookieStore.set(name, value, options);
        }
    } catch {
        // ver comentário acima
    }
}

async function doFetch(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...init.headers,
            Cookie: await cookieHeader(),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
}

//Sem retry de /auth/refresh aqui de propósito. O refresh token da API é rotativo com
//detecção de reuso: renovar gera um token novo e revoga o anterior, então um refresh
//cujo Set-Cookie não chega ao navegador não é só inútil — ele DESTRÓI a sessão. E era
//exatamente isso que acontecia, porque o consumidor mais frequente deste módulo é o
//getCurrentUser() do layout raiz, que roda durante o render, onde applySetCookies não
//consegue persistir nada. O navegador seguia com o token já revogado e a próxima
//renovação era lida pela API como reuso (roubo), derrubando a sessão em todos os
//dispositivos. Renovar é responsabilidade exclusiva do src/proxy.ts, que roda antes do
//render e consegue gravar o cookie; um 401 que chegue aqui é sessão realmente encerrada.
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { method = "GET", body } = options;

    const init: RequestInit = {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    const res = await doFetch(path, init);

    applySetCookies(res.headers.getSetCookie(), await cookies());

    return parseApiResponse<T>(res);
}

export { ApiError };
