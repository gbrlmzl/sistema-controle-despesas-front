import { act, renderHook, waitFor } from "@testing-library/react";
import { useAnexarComprovante } from "./useAnexarComprovante";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { comprimirImagem } from "@/utils/comprimirImagem";

jest.mock("@/lib/apiClient.client");
//A compressão em si já é testada em comprimirImagem.test.ts -- aqui o hook só
//precisa saber que ela roda antes do passo 2 e que o resultado dela é o que
//viaja pro S3, não o arquivo original.
jest.mock("@/utils/comprimirImagem");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;
const mockComprimirImagem = comprimirImagem as jest.MockedFunction<typeof comprimirImagem>;

const ALVO = { code: "AB12CD", month: 8, year: 2026, settlementId: "s1" };

const UPLOAD_TICKET = {
    receiptId: "r1",
    upload: { url: "https://cronos-comprovantes-dev.s3.us-east-2.amazonaws.com", fields: { key: "residences/1/...", "Content-Type": "image/webp" } },
    expiresInSeconds: 300,
};

function arquivoImagem(bytes = 1000) {
    return new File([new Uint8Array(bytes)], "comprovante.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
    mockApiFetchClient.mockReset();
    mockComprimirImagem.mockReset();
    mockComprimirImagem.mockImplementation(async (arquivo) => arquivo);
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
});

describe("useAnexarComprovante -- validação client-side (poupa ida e volta, RN-081)", () => {
    it("rejeita tipo não suportado sem chamar comprimirImagem nem a API", async () => {
        const { result } = renderHook(() => useAnexarComprovante());
        const arquivo = new File(["x"], "documento.txt", { type: "text/plain" });

        await act(async () => { await result.current.anexar(ALVO, arquivo); });

        expect(result.current.erro?.mensagem).toBe("Formato não suportado. Envie JPEG, PNG, WebP ou PDF.");
        expect(mockComprimirImagem).not.toHaveBeenCalled();
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("rejeita arquivo acima de 5 MB sem chamar a API", async () => {
        const { result } = renderHook(() => useAnexarComprovante());
        const arquivo = arquivoImagem(6 * 1024 * 1024);

        await act(async () => { await result.current.anexar(ALVO, arquivo); });

        expect(result.current.erro?.mensagem).toBe("O comprovante deve ter no máximo 5 MB.");
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });
});

describe("useAnexarComprovante -- os 4 passos, na ordem (C.4)", () => {
    it("comprime, pede a intenção, envia ao S3 e completa, nesta ordem", async () => {
        const ordem: string[] = [];
        mockComprimirImagem.mockImplementation(async (arquivo) => { ordem.push("comprimir"); return arquivo; });
        mockApiFetchClient.mockImplementation(async (path: string) => {
            if (path.endsWith("/receipts")) { ordem.push("intencao"); return UPLOAD_TICKET; }
            if (path.endsWith("/complete")) { ordem.push("completar"); return {}; }
            throw new Error(`path inesperado: ${path}`);
        });
        (global.fetch as jest.Mock).mockImplementation(async () => { ordem.push("s3"); return { ok: true } as Response; });

        const { result } = renderHook(() => useAnexarComprovante());
        let sucesso: boolean | undefined;
        await act(async () => { sucesso = await result.current.anexar(ALVO, arquivoImagem()); });

        expect(ordem).toEqual(["comprimir", "intencao", "s3", "completar"]);
        expect(result.current.estado).toBe("ocioso");
        expect(result.current.erro).toBeNull();
        //O retorno (não o estado reativo) é o que o componente usa pra saber, na
        //hora, se deve atualizar a tela -- ver comentário do hook sobre closure velho.
        expect(sucesso).toBe(true);
    });

    it("o passo 2 chama a rota de intenção com :period no formato AAAA-MM e o contentType/tamanho do arquivo comprimido", async () => {
        mockApiFetchClient.mockResolvedValueOnce(UPLOAD_TICKET).mockResolvedValueOnce({});
        const { result } = renderHook(() => useAnexarComprovante());

        await act(async () => { await result.current.anexar(ALVO, arquivoImagem(1234)); });

        expect(mockApiFetchClient).toHaveBeenNthCalledWith(1,
            "/residences/AB12CD/closures/2026-08/settlements/s1/receipts",
            { method: "POST", body: { contentType: "image/jpeg", sizeInBytes: 1234, originalName: "comprovante.jpg" } },
        );
    });

    it("o passo 3 usa fetch puro (não apiFetchClient), sem credentials, com `file` como último campo do FormData", async () => {
        mockApiFetchClient.mockResolvedValueOnce(UPLOAD_TICKET).mockResolvedValueOnce({});
        const { result } = renderHook(() => useAnexarComprovante());

        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(global.fetch).toHaveBeenCalledWith(UPLOAD_TICKET.upload.url, expect.objectContaining({ method: "POST" }));
        const chamada = (global.fetch as jest.Mock).mock.calls[0];
        const init = chamada[1] as RequestInit;
        expect(init).not.toHaveProperty("credentials");

        const form = init.body as FormData;
        const campos = Array.from(form.keys());
        expect(campos.at(-1)).toBe("file");
        expect(campos).toEqual(["key", "Content-Type", "file"]);
    });

    it("o passo 4 chama a rota de complete com o receiptId devolvido no passo 2", async () => {
        mockApiFetchClient.mockResolvedValueOnce(UPLOAD_TICKET).mockResolvedValueOnce({});
        const { result } = renderHook(() => useAnexarComprovante());

        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(mockApiFetchClient).toHaveBeenNthCalledWith(2,
            "/residences/AB12CD/closures/2026-08/settlements/s1/receipts/r1/complete",
            { method: "POST" },
        );
    });
});

describe("useAnexarComprovante -- falhas e retry (armadilha nº4 do C.4)", () => {
    it("falha no passo 3 (rede) não chama o passo 4, e o erro não guarda receiptId (retry reinicia tudo)", async () => {
        mockApiFetchClient.mockResolvedValueOnce(UPLOAD_TICKET);
        (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

        const { result } = renderHook(() => useAnexarComprovante());
        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(mockApiFetchClient).toHaveBeenCalledTimes(1); // só a intenção, não o complete
        expect(result.current.erro).toEqual({ mensagem: "Não foi possível enviar o arquivo. Verifique sua conexão.", receiptId: null });
    });

    it("falha no passo 4 preserva o receiptId -- tentarNovamente refaz só o passo 4, não o 3", async () => {
        mockApiFetchClient
            .mockResolvedValueOnce(UPLOAD_TICKET)
            .mockRejectedValueOnce(new ApiError(422, "Conteúdo divergente"))
            .mockResolvedValueOnce({});

        const { result } = renderHook(() => useAnexarComprovante());
        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(result.current.erro?.receiptId).toBe("r1");
        expect(result.current.erro?.mensagem).toBe("O arquivo enviado não pôde ser validado. Tente enviar novamente.");

        const chamadasFetchAntes = (global.fetch as jest.Mock).mock.calls.length;
        await act(async () => { await result.current.tentarNovamente(ALVO); });

        expect(global.fetch).toHaveBeenCalledTimes(chamadasFetchAntes); // passo 3 não foi refeito
        expect(mockApiFetchClient).toHaveBeenNthCalledWith(3,
            "/residences/AB12CD/closures/2026-08/settlements/s1/receipts/r1/complete",
            { method: "POST" },
        );
        expect(result.current.erro).toBeNull();
        expect(result.current.estado).toBe("ocioso");
    });

    it("503 na intenção mostra a mensagem amigável do C.7, não a mensagem crua da API", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(503, "Armazenamento de comprovantes indisponível."));

        const { result } = renderHook(() => useAnexarComprovante());
        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(result.current.erro?.mensagem).toBe("O envio de comprovantes está indisponível no momento. Tente mais tarde.");
    });

    it("qualquer outro status de erro na intenção repassa a mensagem da API sem reescrever (F-08)", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(404, "Não é membro desta residência"));

        const { result } = renderHook(() => useAnexarComprovante());
        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(result.current.erro?.mensagem).toBe("Não é membro desta residência");
    });
});

function criarDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => { resolve = res; });
    return { promise, resolve };
}

describe("useAnexarComprovante -- estados de progresso", () => {
    it("mostra 'enviando' enquanto a intenção de upload está em andamento", async () => {
        const deferred = criarDeferred<typeof UPLOAD_TICKET>();
        mockApiFetchClient.mockReturnValueOnce(deferred.promise as ReturnType<typeof apiFetchClient>);
        const { result } = renderHook(() => useAnexarComprovante());

        act(() => { result.current.anexar(ALVO, arquivoImagem()); });

        await waitFor(() => expect(result.current.estado).toBe("enviando"));

        await act(async () => {
            deferred.resolve(UPLOAD_TICKET);
            await deferred.promise;
        });
    });

    it("volta a 'ocioso' depois que o fluxo inteiro termina", async () => {
        mockApiFetchClient.mockResolvedValueOnce(UPLOAD_TICKET).mockResolvedValueOnce({});
        const { result } = renderHook(() => useAnexarComprovante());

        await act(async () => { await result.current.anexar(ALVO, arquivoImagem()); });

        expect(result.current.estado).toBe("ocioso");
    });
});
