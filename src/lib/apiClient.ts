//Server-only: importa next/headers, que quebra o build se acabar puxado por um
//Client Component. Não deve ser importado fora de Server Actions/Components.
import { cookies } from "next/headers";
import { ApiError, parseApiResponse } from "./apiError";

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

//Um Set-Cookie da API vira um cookie no navegador só se a gente o repetir aqui —
//parse manual porque next/headers não aceita a string crua de Set-Cookie.
function applySetCookie(rawSetCookie: string, cookieStore: Awaited<ReturnType<typeof cookies>>): void {
    const parts = rawSetCookie.split(";").map(p => p.trim());
    const [name, ...valueParts] = parts[0].split("=");
    const value = valueParts.join("=");

    const options: Record<string, unknown> = {};
    for (const attr of parts.slice(1)) {
        const [rawKey, rawVal] = attr.split("=");
        const key = rawKey.toLowerCase();
        switch (key) {
            case "path":
                options.path = rawVal;
                break;
            case "max-age":
                options.maxAge = Number(rawVal);
                break;
            case "expires":
                options.expires = new Date(rawVal);
                break;
            case "samesite":
                options.sameSite = rawVal.toLowerCase();
                break;
            case "secure":
                options.secure = true;
                break;
            case "httponly":
                options.httpOnly = true;
                break;
        }
    }

    cookieStore.set(name, value, options);
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
        const cookieStore = await cookies();
        for (const setCookie of refreshed.headers.getSetCookie()) {
            applySetCookie(setCookie, cookieStore);
        }

        if (refreshed.ok) {
            res = await doFetch(path, init);
        }
    }

    const cookieStore = await cookies();
    for (const setCookie of res.headers.getSetCookie()) {
        applySetCookie(setCookie, cookieStore);
    }

    return parseApiResponse<T>(res);
}

export { ApiError };
