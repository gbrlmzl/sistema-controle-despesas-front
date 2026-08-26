import { getClosureSettlements } from "./acertosApi";
import { apiFetch, ApiError } from "./apiClient";

//Factory explícita: apiClient.ts importa next/headers, que só existe dentro do
//runtime de servidor do Next.js e quebraria em jsdom se o módulo real fosse
//carregado (mesmo padrão de expensesApi.test.ts).
jest.mock("./apiClient", () => ({
    apiFetch: jest.fn(),
    ApiError: jest.requireActual("./apiError").ApiError,
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
    mockApiFetch.mockReset();
});

describe("getClosureSettlements", () => {
    it("monta o :period no formato AAAA-MM a partir da competência", async () => {
        mockApiFetch.mockResolvedValue({
            competency: { month: 8, year: 2026 },
            closedAt: "2026-09-01T14:02:11.000Z",
            closedByName: "Gabriel Mizael",
            status: "SETTLED",
            settledAt: "2026-09-01T14:02:11.000Z",
            totals: { payerSide: { lines: 0, paid: 0 }, receiverSide: { lines: 0, confirmed: 0 } },
            canAct: true,
            canUpload: true,
            settlements: [],
        });

        await getClosureSettlements("AB12CD", { month: 8, year: 2026 });

        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/closures/2026-08/settlements");
    });

    it("traduz os pares devolvidos pela API, preservando os dois carimbos independentes (D-30)", async () => {
        mockApiFetch.mockResolvedValue({
            competency: { month: 8, year: 2026 },
            closedAt: "2026-09-01T14:02:11.000Z",
            closedByName: "Gabriel Mizael",
            status: "AWAITING_CONFIRMATION",
            settledAt: null,
            totals: { payerSide: { lines: 1, paid: 1 }, receiverSide: { lines: 1, confirmed: 0 } },
            canAct: true,
            canUpload: true,
            settlements: [
                {
                    id: "8d21c07e",
                    payer: { userId: 7, name: "Letícia Rocha" },
                    receiver: { userId: 3, name: "Gabriel Mizael" },
                    amountInCents: 21910,
                    isMinePaying: false,
                    isMineReceiving: true,
                    status: "AWAITING_CONFIRMATION",
                    paidAt: "2026-09-03T09:11:00.000Z",
                    confirmedAt: null,
                    waivedAt: null,
                    waiveReason: null,
                    receipts: [
                        {
                            id: "4f0c9ab1",
                            contentType: "image/webp",
                            sizeInBytes: 244121,
                            originalName: "comprovante.jpg",
                            uploadedAt: "2026-09-03T09:11:00.000Z",
                            uploadedByName: "Letícia Rocha",
                        },
                    ],
                },
            ],
        });

        const resultado = await getClosureSettlements("AB12CD", { month: 8, year: 2026 });

        expect(resultado).not.toBeNull();
        expect(resultado!.status).toBe("AWAITING_CONFIRMATION");
        expect(resultado!.acertos).toHaveLength(1);
        expect(resultado!.acertos[0]).toEqual({
            id: "8d21c07e",
            payer: { userId: 7, name: "Letícia Rocha" },
            receiver: { userId: 3, name: "Gabriel Mizael" },
            amountInCents: 21910,
            isMinePaying: false,
            isMineReceiving: true,
            status: "AWAITING_CONFIRMATION",
            paidAt: "2026-09-03T09:11:00.000Z",
            confirmedAt: null,
            waivedAt: null,
            waiveReason: null,
            receipts: [
                {
                    id: "4f0c9ab1",
                    contentType: "image/webp",
                    sizeInBytes: 244121,
                    originalName: "comprovante.jpg",
                    uploadedAt: "2026-09-03T09:11:00.000Z",
                    uploadedByName: "Letícia Rocha",
                },
            ],
        });
    });

    it("devolve null em 404 (não-membro ou período sem fechamento) -- a página trata como notFound()", async () => {
        mockApiFetch.mockRejectedValue(new ApiError(404, "Não encontrado"));

        const resultado = await getClosureSettlements("AB12CD", { month: 8, year: 2026 });

        expect(resultado).toBeNull();
    });

    it("propaga qualquer outro erro sem engolir a exceção", async () => {
        mockApiFetch.mockRejectedValue(new Error("Falha de rede"));

        await expect(getClosureSettlements("AB12CD", { month: 8, year: 2026 })).rejects.toThrow("Falha de rede");
    });
});
