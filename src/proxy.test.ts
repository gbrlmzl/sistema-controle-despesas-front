/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

//O módulo lança na importação se API_URL não existir, e lê a variável uma vez só —
//por isso a env é montada antes do import dinâmico lá embaixo.
process.env.API_URL = "http://api.test";

type Proxy = (req: NextRequest) => Promise<Response>;

let proxy: Proxy;
let config: { matcher: unknown };

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

beforeAll(async () => {
    const mod = await import("./proxy");
    proxy = mod.default as unknown as Proxy;
    config = mod.config;
});

beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
});

//JWT de mentira: só o payload importa aqui, porque o proxy não valida assinatura de
//propósito (o segredo é da API). Base64url sem padding, igual ao que a API emite.
function jwtComExp(exp: number): string {
    const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
    return `cabecalho.${payload}.assinatura`;
}

const JWT_VALIDO = jwtComExp(Math.floor(Date.now() / 1000) + 900);
const JWT_EXPIRADO = jwtComExp(Math.floor(Date.now() / 1000) - 60);

function requisicao(pathname: string, cookies: Record<string, string> = {}): NextRequest {
    const cookie = Object.entries(cookies)
        .map(([nome, valor]) => `${nome}=${valor}`)
        .join("; ");

    return new NextRequest(`http://front.test${pathname}`, {
        headers: cookie ? { cookie } : {},
    });
}

function respostaDeRefresh(): Response {
    const headers = new Headers();
    headers.append("set-cookie", "JWT=jwt-novo; Path=/; HttpOnly; SameSite=Lax");
    headers.append("set-cookie", "REFRESH=refresh-novo; Path=/; HttpOnly; SameSite=Lax");
    return new Response(null, { status: 200, headers });
}

//O header interno que o Next usa pra levar o Cookie reescrito até o render. É o único
//jeito de provar a propagação sem subir o servidor — e é justamente ela que faz o
//cookies() de next/headers enxergar a sessão renovada (ver propagarCookies em proxy.ts).
function cookieDoRequest(response: Response): string | null {
    return response.headers.get("x-middleware-request-cookie");
}

describe("proxy — rota protegida", () => {
    it("manda pro /login quem não tem cookie nenhum, sem tentar renovar", async () => {
        const response = await proxy(requisicao("/dashboard"));

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://front.test/login");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("deixa passar quem tem JWT válido, sem tocar na API", async () => {
        const response = await proxy(requisicao("/dashboard/residences", { JWT: JWT_VALIDO }));

        expect(response.headers.get("location")).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("renova quando o JWT expirou e o REFRESH ainda existe", async () => {
        fetchMock.mockResolvedValue(respostaDeRefresh());

        const response = await proxy(requisicao("/dashboard", { JWT: JWT_EXPIRADO, REFRESH: "ref-antigo" }));

        expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/refresh", expect.objectContaining({ method: "POST" }));
        expect(response.headers.get("location")).toBeNull();
    });

    it("renova também quando o cookie JWT já sumiu (expirou junto com o token)", async () => {
        fetchMock.mockResolvedValue(respostaDeRefresh());

        await proxy(requisicao("/dashboard", { REFRESH: "ref-antigo" }));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("propaga o cookie renovado pro request desta mesma passada e pra resposta", async () => {
        fetchMock.mockResolvedValue(respostaDeRefresh());

        const response = await proxy(requisicao("/dashboard", { JWT: JWT_EXPIRADO, REFRESH: "ref-antigo" }));

        //Sem isto, o getCurrentUser() do layout raiz renderizaria com o cookie velho.
        expect(cookieDoRequest(response)).toContain("JWT=jwt-novo");
        expect(cookieDoRequest(response)).toContain("REFRESH=refresh-novo");
        //E sem isto, o navegador não guardaria o token novo e reapresentaria o revogado.
        expect(response.headers.get("set-cookie")).toContain("JWT=jwt-novo");
    });

    it("limpa a sessão morta ao mandar pro /login quando a renovação falha", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

        const response = await proxy(requisicao("/dashboard", { JWT: JWT_EXPIRADO, REFRESH: "ref-invalido" }));

        expect(response.headers.get("location")).toBe("http://front.test/login");
        //Deixar os cookies mortos no navegador faz cada navegação seguinte reapresentar
        //um refresh token rotativo já revogado — que a API lê como roubo.
        const setCookie = response.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain("JWT=;");
        expect(setCookie).toContain("REFRESH=;");
        expect(setCookie).toContain("Max-Age=0");
    });

    it("não derruba a navegação quando a API de refresh está fora do ar", async () => {
        fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

        const response = await proxy(requisicao("/dashboard", { REFRESH: "ref" }));

        expect(response.headers.get("location")).toBe("http://front.test/login");
    });
});

describe("proxy — rotas só de deslogado", () => {
    it("manda pra home quem já tem sessão válida", async () => {
        const response = await proxy(requisicao("/login", { JWT: JWT_VALIDO }));

        expect(response.headers.get("location")).toBe("http://front.test/");
    });

    it("deixa entrar no /login quem tem JWT expirado e nenhum REFRESH", async () => {
        //Regressão: com estaLogado saindo de "!!jwt", esse usuário era tratado como
        //logado e devolvido pra "/" — sem conseguir refazer o login em lugar nenhum.
        const response = await proxy(requisicao("/login", { JWT: JWT_EXPIRADO }));

        expect(response.headers.get("location")).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("leva pra home, já com o cookie novo, quem chega no /login com sessão renovável", async () => {
        fetchMock.mockResolvedValue(respostaDeRefresh());

        const response = await proxy(requisicao("/login", { REFRESH: "ref-antigo" }));

        expect(response.headers.get("location")).toBe("http://front.test/");
        expect(response.headers.get("set-cookie")).toContain("JWT=jwt-novo");
    });

    it("não expulsa de /change-password quem está logado (F-03)", async () => {
        const response = await proxy(requisicao("/change-password", { JWT: JWT_VALIDO }));

        expect(response.headers.get("location")).toBeNull();
    });
});

describe("proxy — rotas públicas", () => {
    //O bug que motivou ampliar o matcher: getCurrentUser() roda no layout raiz, então
    //"/" também precisa da sessão renovada. Fora do proxy, quem renovava era o
    //apiClient.ts durante o render — sem conseguir persistir o cookie, queimando o
    //refresh token rotativo e fazendo a próxima renovação parecer roubo.
    it("renova a sessão na landing, sem redirecionar ninguém", async () => {
        fetchMock.mockResolvedValue(respostaDeRefresh());

        const response = await proxy(requisicao("/", { REFRESH: "ref-antigo" }));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(response.headers.get("location")).toBeNull();
        expect(cookieDoRequest(response)).toContain("JWT=jwt-novo");
    });

    it("não tenta renovar nada pra visitante anônimo", async () => {
        const response = await proxy(requisicao("/"));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBeNull();
    });
});

describe("proxy — matcher", () => {
    //A doc do proxy.ts já chama isto de unstable_doesProxyMatch, mas o pacote instalado
    //(next 16.3.3) ainda exporta só o nome antigo — a renomeação middleware -> proxy não
    //chegou neste helper. Trocar quando o export novo existir.
    const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");

    function casa(url: string, headers: Record<string, string> = {}): boolean {
        return unstable_doesMiddlewareMatch({ config, url, headers });
    }

    it("cobre as páginas — inclusive a landing e o /change-password", () => {
        expect(casa("/")).toBe(true);
        expect(casa("/dashboard/residences/ABC123")).toBe(true);
        expect(casa("/change-password")).toBe(true);
    });

    it("fica fora do Route Handler da API e dos estáticos", () => {
        expect(casa("/api/users/me")).toBe(false);
        expect(casa("/_next/static/chunks/main.js")).toBe(false);
        expect(casa("/favicon.ico")).toBe(false);
        expect(casa("/avatars/padrao.png")).toBe(false);
    });

    it("ignora prefetch de <Link>", () => {
        //Vários prefetches disparam em paralelo com o MESMO refresh token; renovar em
        //cada um é a corrida que a API interpreta como reuso de token roubado.
        expect(casa("/dashboard", { "next-router-prefetch": "1" })).toBe(false);
        expect(casa("/dashboard", { purpose: "prefetch" })).toBe(false);
        expect(casa("/dashboard")).toBe(true);
    });
});
