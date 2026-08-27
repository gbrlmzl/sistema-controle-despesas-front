import { converterParaPng } from "./converterParaPng";

//Mesma limitação de comprimirImagem.test.ts: jsdom não implementa
//createImageBitmap nem renderização de canvas de verdade -- cobre a
//orquestração com mocks das APIs do navegador, não o resultado visual.
describe("converterParaPng", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("redesenha a imagem no canvas nas dimensões originais e sai como PNG", async () => {
        const bitmapFalso = { width: 1200, height: 800, close: jest.fn() } as unknown as ImageBitmap;
        global.createImageBitmap = jest.fn().mockResolvedValue(bitmapFalso);

        const blobPng = new Blob(["png"], { type: "image/png" });
        const drawImage = jest.fn();
        const toBlob = jest.fn((callback: BlobCallback) => callback(blobPng));
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
        jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob);

        const blobOriginal = new Blob(["webp"], { type: "image/webp" });
        const resultado = await converterParaPng(blobOriginal);

        expect(global.createImageBitmap).toHaveBeenCalledWith(blobOriginal);
        expect(drawImage).toHaveBeenCalledWith(bitmapFalso, 0, 0);
        expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
        expect(resultado).toBe(blobPng);
        expect(bitmapFalso.close).toHaveBeenCalled();
    });

    it("lança um erro tratável quando createImageBitmap falha", async () => {
        global.createImageBitmap = jest.fn().mockRejectedValue(new Error("decode error"));

        await expect(converterParaPng(new Blob(["x"]))).rejects.toThrow("Não foi possível processar esta imagem.");
    });

    it("lança um erro tratável quando o canvas não consegue gerar o blob", async () => {
        const bitmapFalso = { width: 400, height: 300, close: jest.fn() } as unknown as ImageBitmap;
        global.createImageBitmap = jest.fn().mockResolvedValue(bitmapFalso);
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);
        jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback: BlobCallback) => callback(null));

        await expect(converterParaPng(new Blob(["x"]))).rejects.toThrow("Não foi possível converter esta imagem.");
        expect(bitmapFalso.close).toHaveBeenCalled();
    });
});
