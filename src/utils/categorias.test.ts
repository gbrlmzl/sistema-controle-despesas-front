import { competenciaCurta, competenciaTexto, nomeDoMes, rotuloCategoria } from "./categorias";
import { ExpenseCategory } from "@/types/expenseCategory";

describe("rotuloCategoria", () => {
    it("retorna o rótulo correspondente a cada categoria válida", () => {
        expect(rotuloCategoria("ALIMENTACAO")).toBe("Alimentação");
        expect(rotuloCategoria("DOMESTICAS")).toBe("Contas domésticas");
        expect(rotuloCategoria("ASSINATURAS")).toBe("Assinaturas");
        expect(rotuloCategoria("LAZER")).toBe("Lazer");
        expect(rotuloCategoria("OUTROS")).toBe("Outros");
    });

    it("retorna o próprio valor quando a categoria é desconhecida", () => {
        expect(rotuloCategoria("INEXISTENTE" as ExpenseCategory)).toBe("INEXISTENTE");
    });
});

describe("nomeDoMes", () => {
    it("retorna o nome do mês para valores de 1 a 12", () => {
        expect(nomeDoMes(1)).toBe("Janeiro");
        expect(nomeDoMes(6)).toBe("Junho");
        expect(nomeDoMes(12)).toBe("Dezembro");
    });

    it("retorna string vazia para mês fora do intervalo válido", () => {
        expect(nomeDoMes(0)).toBe("");
        expect(nomeDoMes(13)).toBe("");
        expect(nomeDoMes(-1)).toBe("");
    });
});

describe("competenciaTexto", () => {
    it("combina o nome do mês por extenso com o ano", () => {
        expect(competenciaTexto(3, 2026)).toBe("Março de 2026");
    });

    it("propaga string vazia quando o mês é inválido", () => {
        expect(competenciaTexto(13, 2026)).toBe(" de 2026");
    });
});

describe("competenciaCurta", () => {
    it("preenche o mês com zero à esquerda quando necessário", () => {
        expect(competenciaCurta(3, 2026)).toBe("03/2026");
    });

    it("não altera o mês quando já tem dois dígitos", () => {
        expect(competenciaCurta(11, 2026)).toBe("11/2026");
    });
});
