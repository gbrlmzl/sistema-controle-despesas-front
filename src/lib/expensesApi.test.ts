import { getResidenceCompetencies, getResidenceExpenses } from "./expensesApi";
import { apiFetch } from "./apiClient";

//Factory explícita: apiClient.ts importa next/headers, que só existe dentro do
//runtime de servidor do Next.js e quebraria em jsdom se o módulo real fosse
//carregado (mesmo padrão usado em CadastrarDespesaModal.test.tsx).
jest.mock("./apiClient", () => ({ apiFetch: jest.fn() }));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
    mockApiFetch.mockReset();
});

describe("getResidenceCompetencies", () => {
    it("chama o endpoint de competências da residência informada", async () => {
        mockApiFetch.mockResolvedValue([]);

        await getResidenceCompetencies("AB12CD");

        expect(mockApiFetch).toHaveBeenCalledTimes(1);
        expect(mockApiFetch).toHaveBeenCalledWith("/residences/AB12CD/expenses/competencies");
    });

    it("converte a resposta da API para o formato usado pelo SeletorCompetencia", async () => {
        mockApiFetch.mockResolvedValue([
            { month: 6, year: 2026, isClosed: true },
            { month: 7, year: 2026, isClosed: false },
        ]);

        const resultado = await getResidenceCompetencies("AB12CD");

        expect(resultado).toEqual([
            { month: 6, year: 2026, temDespesas: true, isClosed: true },
            { month: 7, year: 2026, temDespesas: true, isClosed: false },
        ]);
    });

    it("propaga o erro quando a API falha, sem engolir a exceção", async () => {
        mockApiFetch.mockRejectedValue(new Error("Falha de rede"));

        await expect(getResidenceCompetencies("AB12CD")).rejects.toThrow("Falha de rede");
    });
});

describe("getResidenceExpenses", () => {
    const RESPOSTA_BASE = {
        competency: { month: 8, year: 2026 },
        byMember: [],
        totalInCents: 0,
        count: 0,
        isClosed: true,
        closedAt: "2026-09-01T14:02:11.000Z",
        closedByName: "Gabriel Mizael",
    };

    it("repassa settlement como null sem alteração", async () => {
        mockApiFetch.mockResolvedValue({ ...RESPOSTA_BASE, settlement: null });

        const { resumo } = await getResidenceExpenses("AB12CD");

        expect(resumo.settlement).toBeNull();
    });

    it("repassa o bloco settlement preenchido sem tradução -- já nasce no formato do front", async () => {
        const settlement = {
            status: "AWAITING_PAYMENT" as const,
            totals: { payerSide: { lines: 2, paid: 1 }, receiverSide: { lines: 2, confirmed: 0 } },
            mine: [
                { id: "s1", role: "PAYER" as const, counterpartyName: "Gabriel Mizael", amountInCents: 21910, status: "PENDING" as const },
                { id: "s2", role: "PAYER" as const, counterpartyName: "Ana Prado", amountInCents: 10762, status: "SETTLED" as const },
            ],
        };
        mockApiFetch.mockResolvedValue({ ...RESPOSTA_BASE, settlement });

        const { resumo } = await getResidenceExpenses("AB12CD");

        expect(resumo.settlement).toEqual(settlement);
    });
});
