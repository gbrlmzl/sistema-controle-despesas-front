import { getResidenceCompetencies } from "./expensesApi";
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
