"use client";
import { parseApiResponse } from "./apiError";

//Base relativa: as chamadas passam pelo rewrite de /api/:path* (next.config.ts),
//que proxia pra API real no servidor. Do ponto de vista do navegador é tudo
//mesma origem — sem CORS, e o cookie de sessão pertence ao domínio do front.
const BASE_URL = "/api";

//Sem timeout, uma API travada (não só fora do ar) deixaria a chamada pendurada indefinidamente.
const TIMEOUT_MS = 10_000;

export interface ApiFetchOptions {
    method?: string;
    body?: unknown;
    skipAuthRetry?: boolean;
}

function doFetch(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, { ...init, credentials: "include", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

//Promise de refresh em andamento, compartilhada entre chamadas concorrentes —
//se duas requisições tomam 401 ao mesmo tempo, a segunda espera o refresh que
//a primeira já disparou em vez de repetir a chamada.
let refreshPromise: Promise<boolean> | null = null;
//Timestamp da última falha de refresh; null = nunca falhou ou o cooldown já passou.
let refreshFailedAt: number | null = null;
const REFRESH_RETRY_COOLDOWN_MS = 30_000;

function isRefreshOnCooldown(): boolean {
    if (refreshFailedAt === null) return false;
    if (Date.now() - refreshFailedAt >= REFRESH_RETRY_COOLDOWN_MS) {
        refreshFailedAt = null;
        return false;
    }
    return true;
}

function tryRefresh(): Promise<boolean> {
    if (isRefreshOnCooldown()) return Promise.resolve(false);
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await doFetch("/auth/refresh", { method: "POST" });
            if (!res.ok) {
                refreshFailedAt = Date.now();
                return false;
            }
            return true;
        } catch {
            refreshFailedAt = Date.now();
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

//Versão client-side: o navegador já manda os cookies certos sozinho
//(credentials:"include"), e um refresh bem-sucedido já atualiza os cookies via
//Set-Cookie normal — não precisa repassar nada manualmente como no lado servidor.
export async function apiFetchClient<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { method = "GET", body, skipAuthRetry = false } = options;

    const init: RequestInit = {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    let res = await doFetch(path, init);

    if (res.status === 401 && !skipAuthRetry && !path.startsWith("/auth")) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            res = await doFetch(path, init);
        }
    }

    return parseApiResponse<T>(res);
}
