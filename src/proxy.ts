import { NextResponse, type NextRequest } from "next/server";
import { parseSetCookie, type ParsedSetCookie } from "@/lib/setCookie";

const API_URL = process.env.API_URL;

if (!API_URL) {
    throw new Error("Variável de ambiente API_URL não configurada.");
}

//Rotas que só fazem sentido pra quem ainda não está logado
const ROTAS_SOMENTE_DESLOGADO = ["/login", "/cadastro"];

//Margem de segurança: renova um pouco antes do exp real, pra absorver o tempo entre
//essa checagem e a chamada que a página vai fazer de fato.
const MARGEM_EXPIRACAO_MS = 5_000;

//Decodifica só o payload do JWT (sem validar assinatura — a lib de JWT da API não
//roda no Edge Runtime) pra decidir se vale a pena tentar renovar antes do render. Não é
//autorização de verdade, só uma heurística de "provavelmente expirado".
function jwtExpirado(token: string): boolean {
    try {
        const payload = token.split(".")[1];
        const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        return typeof json.exp !== "number" || Date.now() >= json.exp * 1000 - MARGEM_EXPIRACAO_MS;
    } catch {
        return true;
    }
}

async function tentarRefresh(req: NextRequest): Promise<ParsedSetCookie[]> {
    try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { Cookie: req.headers.get("cookie") ?? "" },
            signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) return [];
        return res.headers.getSetCookie().map(parseSetCookie);
    } catch {
        return [];
    }
}

//Aplica os cookies renovados tanto na resposta (o navegador atualiza pra próxima
//requisição) quanto no request desta própria passada, reescrevendo o header Cookie —
//só o Set-Cookie da resposta não basta, porque cookies() de next/headers (usado em
//getCurrentUser, residenceApi etc.) lê o Cookie do REQUEST, não o Set-Cookie do proxy.
function propagarCookies(req: NextRequest, cookiesRenovados: ParsedSetCookie[]): NextResponse {
    const cookieMap = new Map(req.cookies.getAll().map(c => [c.name, c.value]));
    for (const { name, value } of cookiesRenovados) {
        cookieMap.set(name, value);
    }

    const novosHeaders = new Headers(req.headers);
    novosHeaders.set("cookie", [...cookieMap].map(([name, value]) => `${name}=${value}`).join("; "));

    const response = NextResponse.next({ request: { headers: novosHeaders } });
    for (const { name, value, options } of cookiesRenovados) {
        response.cookies.set(name, value, options);
    }
    return response;
}

//Camada de autenticação: resolve "tem sessão ou não" antes da página renderizar. Quando
//o JWT (access token, 15 min) expira mas o refreshToken (7 dias) ainda vale, a renovação
//acontece aqui mesmo — é o único ponto do fluxo que roda antes do render e onde o
//Next.js permite escrever cookie de fato (ver src/lib/apiClient.ts: chamar
//cookies().set() durante a renderização de um Server Component lança erro, então um
//refresh disparado só ali nunca conseguia persistir o cookie novo no navegador).
//Autorização de verdade (o token é válido? o usuário pode ver isto?) continua sempre
//responsabilidade da API a cada chamada — um cookie presente mas com refresh também
//expirado/inválido só passa por aqui e falha depois.
export default async function proxy(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl;
    const precisaLogin = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");
    const somenteDeslogado = ROTAS_SOMENTE_DESLOGADO.includes(pathname);

    const jwt = req.cookies.get("JWT")?.value;
    let estaLogado = !!jwt;
    let cookiesRenovados: ParsedSetCookie[] = [];

    if ((precisaLogin || somenteDeslogado) && (!jwt || jwtExpirado(jwt)) && req.cookies.has("refreshToken")) {
        cookiesRenovados = await tentarRefresh(req);
        estaLogado = cookiesRenovados.length > 0;
    }

    if (precisaLogin && !estaLogado) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (somenteDeslogado && estaLogado) {
        const redirect = NextResponse.redirect(new URL("/", req.nextUrl));
        for (const { name, value, options } of cookiesRenovados) {
            redirect.cookies.set(name, value, options);
        }
        return redirect;
    }

    if (cookiesRenovados.length === 0) {
        return NextResponse.next();
    }

    return propagarCookies(req, cookiesRenovados);
}

export const config = {
    matcher: ["/dashboard/:path*", "/profile/:path*", "/login", "/cadastro"],
};
