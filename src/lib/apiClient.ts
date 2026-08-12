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
    //Evita o retry silencioso em /auth/refresh (senão um refresh que falha tentaria
    //se auto-atualizar em loop) e nas próprias rotas de login/registro (401 ali é
    //"credenciais erradas", não "sessão expirada").
    skipAuthRetry?: boolean;
}

//Repassa os cookies recebidos do navegador pra API — fetch() do lado do servidor
//Next.js não faz isso sozinho quando o destino é uma origem diferente.
async function cookieHeader(): Promise<string> {
    const cookieStore = await cookies();
    return cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
}

//Um Set-Cookie da API vira um cookie no navegador só se a gente o repetir aqui.
//Fora de Server Action/Route Handler (ex.: getCurrentUser rodando durante o render de
//um Server Component), o Next.js proíbe escrever cookie e cookieStore.set() lança —
//nesse caso o proxy.ts (middleware) já devia ter renovado a sessão antes do render (é
//o único ponto do fluxo onde dá pra persistir cookie a tempo); se mesmo assim sobrar um
//401 aqui, só falha graciosamente em vez de derrubar a página inteira.
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

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { method = "GET", body, skipAuthRetry = false } = options;

    const init: RequestInit = {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let res = await doFetch(path, init);

    if (res.status === 401 && !skipAuthRetry && !path.startsWith("/auth")) {
        const refreshed = await doFetch("/auth/refresh", { method: "POST" });
        applySetCookies(refreshed.headers.getSetCookie(), await cookies());

        if (refreshed.ok) {
            res = await doFetch(path, init);
        }
    }

    applySetCookies(res.headers.getSetCookie(), await cookies());

    return parseApiResponse<T>(res);
}

export { ApiError };
