import { ApiError, parseApiResponse } from "./apiError";

function mockResponse(init: { status: number; ok: boolean; json?: () => Promise<unknown> }): Response {
    return {
        status: init.status,
        ok: init.ok,
        json: init.json ?? (() => Promise.resolve(null)),
    } as Response;
}

describe("ApiError", () => {
    it("guarda o status e a mensagem, com o nome ApiError", () => {
        const erro = new ApiError(404, "Residência não encontrada");

        expect(erro).toBeInstanceOf(Error);
        expect(erro.name).toBe("ApiError");
        expect(erro.status).toBe(404);
        expect(erro.message).toBe("Residência não encontrada");
    });
});

describe("parseApiResponse", () => {
    it("retorna undefined para status 204, sem ler o corpo", async () => {
        const res = mockResponse({
            status: 204,
            ok: true,
            json: () => Promise.reject(new Error("não deveria ser chamado")),
        });

        await expect(parseApiResponse(res)).resolves.toBeUndefined();
    });

    it("retorna o corpo em JSON quando a resposta é bem-sucedida", async () => {
        const corpo = { id: "abc123", name: "Casa" };
        const res = mockResponse({ status: 200, ok: true, json: () => Promise.resolve(corpo) });

        await expect(parseApiResponse(res)).resolves.toEqual(corpo);
    });

    it("lança ApiError com a mensagem devolvida pela API quando a resposta não é ok", async () => {
        const res = mockResponse({
            status: 400,
            ok: false,
            json: () => Promise.resolve({ message: "Nome inválido" }),
        });

        await expect(parseApiResponse(res)).rejects.toMatchObject({
            name: "ApiError",
            status: 400,
            message: "Nome inválido",
        });
    });

    it("usa mensagem padrão quando o corpo do erro não tem 'message'", async () => {
        const res = mockResponse({ status: 500, ok: false, json: () => Promise.resolve({}) });

        await expect(parseApiResponse(res)).rejects.toMatchObject({
            status: 500,
            message: "Erro na comunicação com o servidor.",
        });
    });

    it("usa mensagem padrão quando o corpo do erro não é um JSON válido", async () => {
        const res = mockResponse({
            status: 500,
            ok: false,
            json: () => Promise.reject(new Error("corpo vazio")),
        });

        await expect(parseApiResponse(res)).rejects.toMatchObject({
            status: 500,
            message: "Erro na comunicação com o servidor.",
        });
    });
});
