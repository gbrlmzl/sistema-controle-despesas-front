import { calcularDimensoes, comprimirImagem } from "./comprimirImagem";

describe("calcularDimensoes", () => {
    it("nunca amplia -- imagem menor que o teto mantém o tamanho original", () => {
        expect(calcularDimensoes(400, 300, 1600)).toEqual({ largura: 400, altura: 300 });
    });

    it("reduz o lado maior até o teto, mantendo a proporção", () => {
        expect(calcularDimensoes(3200, 1600, 1600)).toEqual({ largura: 1600, altura: 800 });
    });

    it("funciona com o retrato (altura maior que a largura)", () => {
        expect(calcularDimensoes(1200, 4800, 1600)).toEqual({ largura: 400, altura: 1600 });
    });
});

//jsdom não implementa createImageBitmap nem renderização de canvas de verdade
//(não há o pacote `canvas` instalado) -- os testes abaixo cobrem a orquestração
//com mocks das APIs do navegador, não o resultado visual da compressão em si.
//Buraco de cobertura registrado em docs/backlog-e-casos-de-teste.md.
describe("comprimirImagem", () => {
    const arquivoPdf = new File(["conteúdo"], "comprovante.pdf", { type: "application/pdf" });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("PDF passa direto, sem chamar createImageBitmap", async () => {
        const mockCreateImageBitmap = jest.fn();
        global.createImageBitmap = mockCreateImageBitmap;

        const resultado = await comprimirImagem(arquivoPdf);

        expect(resultado).toBe(arquivoPdf);
        expect(mockCreateImageBitmap).not.toHaveBeenCalled();
    });

    it("imagem é redesenhada no canvas e sai como WebP, com o nome trocado", async () => {
        const bitmapFalso = { width: 3200, height: 1600, close: jest.fn() } as unknown as ImageBitmap;
        global.createImageBitmap = jest.fn().mockResolvedValue(bitmapFalso);

        const blobFalso = new Blob(["webp"], { type: "image/webp" });
        const drawImage = jest.fn();
        const toBlob = jest.fn((callback: BlobCallback) => callback(blobFalso));
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
        jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob);

        const arquivoOriginal = new File(["jpeg"], "comprovante.jpg", { type: "image/jpeg" });
        const resultado = await comprimirImagem(arquivoOriginal);

        expect(drawImage).toHaveBeenCalledWith(bitmapFalso, 0, 0, 1600, 800);
        expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", expect.any(Number));
        expect(resultado.name).toBe("comprovante.webp");
        expect(resultado.type).toBe("image/webp");
        expect(bitmapFalso.close).toHaveBeenCalled();
    });

    it("lança um erro tratável quando createImageBitmap falha (arquivo corrompido)", async () => {
        global.createImageBitmap = jest.fn().mockRejectedValue(new Error("decode error"));

        await expect(comprimirImagem(new File(["x"], "quebrado.jpg", { type: "image/jpeg" })))
            .rejects.toThrow("Não foi possível processar esta imagem. Tente outro arquivo.");
    });

    it("lança um erro tratável quando o canvas não consegue gerar o blob", async () => {
        const bitmapFalso = { width: 800, height: 600, close: jest.fn() } as unknown as ImageBitmap;
        global.createImageBitmap = jest.fn().mockResolvedValue(bitmapFalso);
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);
        jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback: BlobCallback) => callback(null));

        await expect(comprimirImagem(new File(["x"], "foto.jpg", { type: "image/jpeg" })))
            .rejects.toThrow("Não foi possível comprimir a imagem.");
        expect(bitmapFalso.close).toHaveBeenCalled();
    });
});
