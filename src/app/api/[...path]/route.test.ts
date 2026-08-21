/**
 * @jest-environment node
 */
//Ambiente node (não jsdom, o padrão do projeto): Request/Response/fetch reais
//só existem sob esse ambiente — é o próprio Node quem os fornece. jsdom não
//implementa a Fetch API, então testar um Route Handler com o ambiente padrão
//falharia com "Request is not defined" antes mesmo de chegar no handler.
//
//API_URL vem de .env.test (http://localhost:8080), carregado automaticamente
//pelo next/jest quando NODE_ENV=test — não precisa ser setado aqui.
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "./route";

function ctx(path: string[]) {
    return { params: Promise.resolve({ path }) };
}

describe("proxy /api/[...path]", () => {
    const originalFetch = global.fetch;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("monta a URL de destino com o path e a query string, e não segue redirect automaticamente", async () => {
        fetchMock.mockResolvedValue(new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }));

        const req = new NextRequest("http://front.example.com/api/users/me%20too?foo=bar");
        await GET(req, ctx(["users", "me too"]));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [destino, init] = fetchMock.mock.calls[0];
        expect(destino).toBe("http://localhost:8080/users/me%20too?foo=bar");
        expect(init.method).toBe("GET");
        expect(init.body).toBeUndefined();
        expect(init.redirect).toBe("manual");
        expect(init.duplex).toBeUndefined();
    });

    it("repassa headers do navegador mas remove os hop-by-hop (host, connection, content-length)", async () => {
        fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

        const req = new NextRequest("http://front.example.com/api/residences", {
            headers: {
                host: "front.example.com",
                connection: "keep-alive",
                "content-length": "0",
                cookie: "JWT=abc",
                "x-custom": "1",
            },
        });
        await GET(req, ctx(["residences"]));

        const [, init] = fetchMock.mock.calls[0];
        const headers = init.headers as Headers;
        expect(headers.get("host")).toBeNull();
        expect(headers.get("connection")).toBeNull();
        expect(headers.get("content-length")).toBeNull();
        expect(headers.get("cookie")).toBe("JWT=abc");
        expect(headers.get("x-custom")).toBe("1");
    });

    it("repassa o corpo em requisições com body, usando duplex half", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

        const req = new NextRequest("http://front.example.com/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username: "gabriel", password: "senha123" }),
        });
        await POST(req, ctx(["auth", "login"]));

        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe("POST");
        expect(init.body).toBe(req.body);
        expect(init.duplex).toBe("half");
    });

    it("reemite múltiplos Set-Cookie como headers separados, não agrupados por vírgula", async () => {
        const apiHeaders = new Headers();
        apiHeaders.append("set-cookie", "JWT=abc; Path=/; HttpOnly");
        apiHeaders.append("set-cookie", "REFRESH=xyz; Path=/; HttpOnly");
        apiHeaders.set("content-type", "application/json");
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: apiHeaders }));

        const req = new NextRequest("http://front.example.com/api/auth/login", { method: "POST" });
        const res = await POST(req, ctx(["auth", "login"]));

        const setCookies = res.headers.getSetCookie();
        expect(setCookies).toHaveLength(2);
        expect(setCookies).toContain("JWT=abc; Path=/; HttpOnly");
        expect(setCookies).toContain("REFRESH=xyz; Path=/; HttpOnly");
        expect(res.headers.get("content-type")).toBe("application/json");
    });

    it("repassa 302 sem seguir o redirect, preservando o Location (fluxo do OAuth do Google)", async () => {
        fetchMock.mockResolvedValue(
            new Response(null, {
                status: 302,
                headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?client_id=x" },
            }),
        );

        const req = new NextRequest("http://front.example.com/api/auth/google");
        const res = await GET(req, ctx(["auth", "google"]));

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth?client_id=x");
    });

    it("remove content-encoding/content-length/transfer-encoding da resposta repassada", async () => {
        fetchMock.mockResolvedValue(
            new Response("texto já descomprimido pelo fetch", {
                status: 200,
                headers: {
                    "content-encoding": "gzip",
                    "content-length": "999",
                    "transfer-encoding": "chunked",
                    "content-type": "text/plain",
                },
            }),
        );

        const req = new NextRequest("http://front.example.com/api/residences");
        const res = await GET(req, ctx(["residences"]));

        expect(res.headers.get("content-encoding")).toBeNull();
        expect(res.headers.get("content-length")).toBeNull();
        expect(res.headers.get("transfer-encoding")).toBeNull();
        expect(res.headers.get("content-type")).toBe("text/plain");
    });

    it("não repassa corpo em respostas 204 (senão o construtor de Response lança)", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

        const req = new NextRequest("http://front.example.com/api/auth/logout", { method: "DELETE" });
        const res = await DELETE(req, ctx(["auth", "logout"]));

        expect(res.status).toBe(204);
        expect(res.body).toBeNull();
    });
});
