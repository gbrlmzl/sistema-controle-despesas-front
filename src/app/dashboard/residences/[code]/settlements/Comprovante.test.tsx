import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Comprovante from "./Comprovante";
import { apiFetchClient } from "@/lib/apiClient.client";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

const PROPS = {
    code: "AB12CD",
    month: 8,
    year: 2026,
    receiptId: "r1",
    contentType: "image/webp",
    originalName: "comprovante.jpg",
};

beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-download");
    global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

describe("Comprovante", () => {
    it("mostra um estado de carregamento antes da URL chegar", () => {
        mockApiFetchClient.mockReturnValue(new Promise(() => { })); // nunca resolve
        render(<Comprovante {...PROPS} />);

        expect(screen.getByText("Carregando comprovante...")).toBeInTheDocument();
    });

    it("busca a URL ao montar, com o :period no formato AAAA-MM", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/x", expiresInSeconds: 300 });
        render(<Comprovante {...PROPS} />);

        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledWith(
            "/residences/AB12CD/closures/2026-08/receipts/r1/url",
        ));
    });

    it("mostra o nome do arquivo em vez de uma miniatura", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.webp", expiresInSeconds: 300 });
        render(<Comprovante {...PROPS} />);

        expect(await screen.findByText("comprovante.jpg")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("monta um nome genérico a partir do content-type quando originalName é null", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/x", expiresInSeconds: 300 });
        render(<Comprovante {...PROPS} originalName={null} />);

        expect(await screen.findByText("comprovante.webp")).toBeInTheDocument();
    });

    it("mostra uma mensagem amigável quando a busca da URL falha", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("404"));
        render(<Comprovante {...PROPS} />);

        expect(await screen.findByText("Não foi possível carregar este comprovante.")).toBeInTheDocument();
    });

    it("busca de novo se o receiptId mudar (outra linha, mesmo componente reaproveitado pela lista)", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/x", expiresInSeconds: 300 });
        const { rerender } = render(<Comprovante {...PROPS} receiptId="r1" />);
        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledTimes(1));

        rerender(<Comprovante {...PROPS} receiptId="r2" />);
        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledTimes(2));
        expect(mockApiFetchClient).toHaveBeenLastCalledWith("/residences/AB12CD/closures/2026-08/receipts/r2/url");
    });
});

describe("Comprovante -- ampliar (lupa)", () => {
    it("clicar na lupa de uma imagem abre um modal com a imagem em tamanho expandido", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.webp", expiresInSeconds: 300 });
        const user = userEvent.setup();
        render(<Comprovante {...PROPS} />);

        await screen.findByText("comprovante.jpg");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Ampliar comprovante" }));

        const imagem = await screen.findByRole("img");
        expect(imagem).toHaveAttribute("src", "https://s3/comprovante.webp");
        expect(imagem).toHaveAttribute("alt", "comprovante.jpg");
    });

    it("fechar o modal de ampliação remove a imagem da tela", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.webp", expiresInSeconds: 300 });
        const user = userEvent.setup();
        render(<Comprovante {...PROPS} />);

        await user.click(await screen.findByRole("button", { name: "Ampliar comprovante" }));
        await user.click(screen.getByRole("button", { name: "Fechar" }));

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("para PDF, a lupa é um link que abre numa aba nova, sem tentar embutir", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.pdf", expiresInSeconds: 300 });
        render(<Comprovante {...PROPS} contentType="application/pdf" />);

        const link = await screen.findByRole("link", { name: "Abrir comprovante" });
        expect(link).toHaveAttribute("href", "https://s3/comprovante.pdf");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener");
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});

describe("Comprovante -- baixar imagem (converte pra PNG)", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.createImageBitmap = jest.fn().mockResolvedValue({ width: 800, height: 600, close: jest.fn() } as unknown as ImageBitmap);
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: jest.fn() } as unknown as CanvasRenderingContext2D);
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it("busca o arquivo, converte pra PNG e baixa o blob resultante com extensão .png", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.webp", expiresInSeconds: 300 });
        const blobOriginal = new Blob(["webp"], { type: "image/webp" });
        const blobPng = new Blob(["png"], { type: "image/png" });
        global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blobOriginal) }) as jest.Mock;
        jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback: BlobCallback) => callback(blobPng));
        const cliqueLink = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { });
        const user = userEvent.setup();
        render(<Comprovante {...PROPS} />);

        await user.click(await screen.findByRole("button", { name: "Baixar comprovante" }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("https://s3/comprovante.webp"));
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(blobPng);
        expect(cliqueLink).toHaveBeenCalled();
        expect(screen.queryByText("Não foi possível baixar. Tente novamente.")).not.toBeInTheDocument();
    });

    it("se o fetch falhar (bucket sem CORS pra leitura), mostra uma mensagem de erro em vez de travar", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.webp", expiresInSeconds: 300 });
        global.fetch = jest.fn().mockRejectedValue(new Error("CORS")) as jest.Mock;
        const user = userEvent.setup();
        render(<Comprovante {...PROPS} />);

        await user.click(await screen.findByRole("button", { name: "Baixar comprovante" }));

        expect(await screen.findByText("Não foi possível baixar. Tente novamente.")).toBeInTheDocument();
    });
});

describe("Comprovante -- baixar PDF", () => {
    it("é um link direto com o atributo download -- o PDF já sai com Content-Disposition: attachment, sem depender de CORS", async () => {
        mockApiFetchClient.mockResolvedValue({ url: "https://s3/comprovante.pdf", expiresInSeconds: 300 });
        render(<Comprovante {...PROPS} contentType="application/pdf" />);

        const link = await screen.findByRole("link", { name: "Baixar comprovante" });
        expect(link).toHaveAttribute("href", "https://s3/comprovante.pdf");
        expect(link).toHaveAttribute("download", "comprovante.jpg");
    });
});
