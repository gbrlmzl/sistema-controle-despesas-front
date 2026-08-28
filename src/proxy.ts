import { NextResponse, type NextRequest } from "next/server";
import { parseSetCookie, type ParsedSetCookie } from "@/lib/setCookie";

const API_URL = process.env.API_URL;

if (!API_URL) {
    throw new Error("Variável de ambiente API_URL não configurada.");
}

//Rotas que só fazem sentido pra quem ainda não está logado. "/change-password"
//NÃO entra aqui de propósito (F-03 do plano de recuperação de senha): o link do
//email precisa funcionar mesmo com sessão ativa — é o caso comum de quem está
//logado no computador (sessão de 7 dias) mas esqueceu a senha do celular. Se essa
//rota entrasse "por consistência" com /login e /register, o proxy chutaria esse
//usuário pra "/" antes de ele conseguir redefinir a senha.
const ROTAS_SOMENTE_DESLOGADO = ["/login", "/register", "/forgot-password"];

//Prefixos que exigem sessão. O matcher cobre o site inteiro (ver config no fim do
//arquivo), então é aqui que se decide o que redireciona pro /login — não lá.
const ROTAS_PROTEGIDAS = ["/dashboard", "/profile"];

const COOKIE_ACCESS = "JWT";
const COOKIE_REFRESH = "REFRESH";

//Margem de segurança: renova um pouco antes do exp real, pra absorver o tempo entre
//essa checagem e a chamada que a página vai fazer de fato.
const MARGEM_EXPIRACAO_MS = 5_000;

//Decodifica só o payload do JWT, sem validar a assinatura, pra decidir se vale a pena
//tentar renovar antes do render. A ausência de validação é deliberada e não tem a ver
//com runtime (o proxy roda em Node desde o Next 16): o segredo de assinatura pertence à
//API e não deve existir no front. Quem diz se o token é legítimo é sempre a API, a cada
//chamada — aqui é só heurística de "provavelmente expirado".
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

//O value cru de um Set-Cookie vem em formato de fio (o Express percent-encoda ao
//emitir), enquanto req.cookies.getAll() já devolve tudo decodificado. Uniformizar os
//dois lados antes de remontar o header Cookie evita reencodar duas vezes o mesmo valor.
function decodificar(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

//Aplica os cookies renovados tanto na resposta (o navegador atualiza pra próxima
//requisição) quanto no request desta própria passada, reescrevendo o header Cookie —
//só o Set-Cookie da resposta não basta, porque cookies() de next/headers (usado em
//getCurrentUser, residenceApi etc.) lê o Cookie do REQUEST, não o Set-Cookie do proxy.
function propagarCookies(req: NextRequest, cookiesRenovados: ParsedSetCookie[]): NextResponse {
    const cookieMap = new Map(req.cookies.getAll().map(c => [c.name, c.value]));
    for (const { name, value } of cookiesRenovados) {
        cookieMap.set(name, decodificar(value));
    }

    //encodeURIComponent na serialização: o mapa acima está todo em texto decodificado, e
    //um valor com "=", ";" ou espaço escapando pro header Cookie corromperia a lista
    //inteira. Hoje passaria batido porque JWT (base64url) e o refresh (hex) são
    //no-op nos dois sentidos — o que torna a falha invisível até o dia em que não for.
    const novosHeaders = new Headers(req.headers);
    novosHeaders.set(
        "cookie",
        [...cookieMap].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "),
    );

    //O value original (ainda encodado) é o que vai pra resposta: ResponseCookies.set
    //grava literalmente, então reencodar aqui produziria um cookie encodado duas vezes.
    const response = NextResponse.next({ request: { headers: novosHeaders } });
    for (const { name, value, options } of cookiesRenovados) {
        response.cookies.set(name, value, options);
    }
    return response;
}

//Sessão morta que continua no navegador não é inofensiva: cada navegação seguinte
//refaz o tentarRefresh (até 5s de timeout) contra um token que nunca mais vai valer e,
//pior, reapresenta um refresh token rotativo já revogado — o que a API lê como reuso.
function limparSessao(response: NextResponse): NextResponse {
    for (const name of [COOKIE_ACCESS, COOKIE_REFRESH]) {
        response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return response;
}

//Camada de autenticação: resolve "tem sessão ou não" antes da página renderizar. Quando
//o JWT (access token, 15 min) expira mas o cookie REFRESH (7 dias) ainda vale, a renovação
//acontece aqui mesmo — e SÓ aqui, do lado servidor. É o único ponto do fluxo que roda
//antes do render e onde o Next.js permite escrever cookie de fato (ver
//src/lib/apiClient.ts: chamar cookies().set() durante a renderização de um Server
//Component lança erro, então um refresh disparado de lá nunca conseguia persistir o
//cookie novo no navegador — e, com refresh token rotativo, cada tentativa dessas
//queimava o token do usuário sem substituí-lo).
//Autorização de verdade (o token é válido? o usuário pode ver isto?) continua sempre
//responsabilidade da API a cada chamada — um cookie presente mas com refresh também
//expirado/inválido só passa por aqui e falha depois.
export default async function proxy(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl;
    const precisaLogin = ROTAS_PROTEGIDAS.some(rota => pathname === rota || pathname.startsWith(`${rota}/`));
    const somenteDeslogado = ROTAS_SOMENTE_DESLOGADO.includes(pathname);

    const jwt = req.cookies.get(COOKIE_ACCESS)?.value;
    //Um JWT presente porém expirado não conta como sessão: sem o "&& !jwtExpirado", um
    //usuário nessa janela era tratado como logado quando não havia cookie REFRESH pra
    //recuperar a sessão — e /login o devolvia pra "/" sem deixar ele logar de novo.
    let estaLogado = !!jwt && !jwtExpirado(jwt);
    let cookiesRenovados: ParsedSetCookie[] = [];

    //Sem restringir por rota: getCurrentUser() roda no layout raiz, então toda página
    //precisa da sessão renovada antes do render, não só as protegidas.
    if (!estaLogado && req.cookies.has(COOKIE_REFRESH)) {
        cookiesRenovados = await tentarRefresh(req);
        estaLogado = cookiesRenovados.length > 0;
    }

    if (precisaLogin && !estaLogado) {
        return limparSessao(NextResponse.redirect(new URL("/login", req.nextUrl)));
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
    matcher: [
        {
            //Cobre o site inteiro, e não só /dashboard, /profile e as rotas de auth: o
            //layout raiz chama getCurrentUser() em TODA página, e o proxy é o único
            //lugar capaz de persistir o cookie renovado. Com a lista antiga, "/" e
            ///change-password ficavam de fora e caíam no apiClient.ts, que renovava um
            //refresh token rotativo sem conseguir guardar o valor novo: o navegador
            //seguia com um token já revogado e a renovação seguinte era lida pela API
            //como reuso — derrubando a sessão em todos os dispositivos e disparando um
            //alerta de roubo falso.
            //A exclusão por ponto no path cobre de uma vez favicon/sitemap/robots e todo
            //o public/ (assets, avatars, fonts, icons) — rotas de página nunca têm ponto.
            source: "/((?!api/|_next/|.*\\.).*)",
            //Prefetch de <Link> não renova sessão. O Next dispara vários em paralelo ao
            //passar o mouse ou ao entrar no viewport, e cada um viraria um POST
            ///auth/refresh com o MESMO refresh token — exatamente a corrida que a API
            //interpreta como reuso de token roubado. A navegação de verdade não traz
            //esses headers e continua renovando normalmente.
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
