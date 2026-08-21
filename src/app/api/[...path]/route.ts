//Route Handler que substitui o rewrite de /api/:path* (ver a remoção em
//next.config.ts): lê API_URL do process.env a CADA requisição, em vez de
//congelar o destino em build-time no routes-manifest.json. É a Abordagem B de
//docs/problema-rewrite-api-build-time.md — trocar de API sem rebuildar a
//imagem, e um único mecanismo (process.env.API_URL em runtime) para os três
//consumidores do endereço da API (este arquivo, src/lib/apiClient.ts e
//src/proxy.ts).
import { NextRequest } from "next/server";

const API_URL = process.env.API_URL;

if (!API_URL) {
    throw new Error("Variável de ambiente API_URL não configurada.");
}

//Headers hop-by-hop: descrevem a conexão entre o navegador e o front, não
//fazem sentido repassados pra API. "host" errado pode confundir roteamento do
//lado de lá; "content-length" fica obsoleto porque o corpo passa como stream
//(sem tamanho conhecido de antemão quando há chunking).
const REQUEST_HEADERS_TO_STRIP = ["host", "connection", "content-length", "keep-alive", "transfer-encoding", "upgrade"];

//content-encoding/content-length: o fetch() do Node já descomprime a resposta
//da API sozinho (undici honra Content-Encoding automaticamente), então
//repassar o header original faria o navegador tentar descomprimir um corpo
//que já chegou descomprimido. transfer-encoding/connection são hop-by-hop,
//como acima.
const RESPONSE_HEADERS_TO_STRIP = ["content-encoding", "content-length", "transfer-encoding", "connection"];

function buildRequestHeaders(req: NextRequest): Headers {
    const headers = new Headers(req.headers);
    for (const name of REQUEST_HEADERS_TO_STRIP) {
        headers.delete(name);
    }
    return headers;
}

//Set-Cookie precisa de tratamento à parte: "new Headers(res.headers)" ou
//headers.set() agrupam múltiplos valores da mesma chave numa única string
//separada por vírgula — o que corrompe cookies (Expires já usa vírgula).
//getSetCookie() devolve cada um intacto, e headers.append() os reemite como
//headers HTTP separados de novo. Se isso quebrar, o login para de funcionar.
function buildResponseHeaders(apiRes: Response): Headers {
    const headers = new Headers();
    apiRes.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        if (RESPONSE_HEADERS_TO_STRIP.includes(key.toLowerCase())) return;
        headers.set(key, value);
    });
    for (const cookie of apiRes.headers.getSetCookie()) {
        headers.append("set-cookie", cookie);
    }
    return headers;
}

interface RouteContext {
    params: Promise<{ path: string[] }>;
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
    const { path } = await ctx.params;
    //encodeURIComponent por segmento: os valores em "path" já vêm decodificados
    //pelo Next, então precisam ser recodificados ao remontar a URL — senão um
    //segmento com "%", espaço etc. quebra o parse da URL de destino.
    const destino = `${API_URL}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

    const semCorpo = req.method === "GET" || req.method === "HEAD";

    const apiRes = await fetch(destino, {
        method: req.method,
        headers: buildRequestHeaders(req),
        body: semCorpo ? undefined : req.body,
        //manual: /api/auth/google responde 302 pro Google — sem isso o fetch
        //seguiria o redirect sozinho e o navegador nunca veria o Location.
        redirect: "manual",
        //Exigido pelo Node quando o corpo da requisição é um stream.
        // @ts-expect-error -- "duplex" ainda não está no lib.dom.d.ts do TS
        duplex: semCorpo ? undefined : "half",
    });

    //204/205/304 não podem ter corpo — repassar apiRes.body (mesmo vazio) faz
    //o construtor de Response lançar "Response with null body status cannot
    //have body".
    const semCorpoNaResposta = apiRes.status === 204 || apiRes.status === 205 || apiRes.status === 304;

    return new Response(semCorpoNaResposta ? null : apiRes.body, {
        status: apiRes.status,
        headers: buildResponseHeaders(apiRes),
    });
}

//Runtime Node explícito: precisa de process.env em request-time, o que o Edge
//Runtime não garante do mesmo jeito (e é o padrão de Route Handlers mesmo sem
//isto — deixado explícito pra não virar Edge por engano numa mudança futura).
export const runtime = "nodejs";

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
