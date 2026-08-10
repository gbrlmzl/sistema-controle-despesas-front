import { formatarValor, parseValorParaCentavos } from "./dinheiro";

//toLocaleString('pt-BR', { style: 'currency' }) usa espaço não-quebrável ( )
//entre o símbolo e o número, não o espaço comum — por isso o   nos valores esperados.
describe("formatarValor", () => {
    it("formata centavos positivos como moeda em pt-BR", () => {
        expect(formatarValor(18050)).toBe("R$ 180,50");
    });

    it("formata centavos negativos", () => {
        expect(formatarValor(-500)).toBe("-R$ 5,00");
    });

    it("formata zero", () => {
        expect(formatarValor(0)).toBe("R$ 0,00");
    });

    it("trata valores não finitos como zero", () => {
        expect(formatarValor(NaN)).toBe("R$ 0,00");
        expect(formatarValor(Infinity)).toBe("R$ 0,00");
        expect(formatarValor(-Infinity)).toBe("R$ 0,00");
    });
});

describe("parseValorParaCentavos", () => {
    it("converte número finito arredondando para o centavo mais próximo", () => {
        expect(parseValorParaCentavos(180.5)).toBe(18050);
        expect(parseValorParaCentavos(180.505)).toBe(18051);
    });

    it("retorna null para número não finito", () => {
        expect(parseValorParaCentavos(NaN)).toBeNull();
        expect(parseValorParaCentavos(Infinity)).toBeNull();
    });

    it("aceita vírgula como separador decimal", () => {
        expect(parseValorParaCentavos("180,50")).toBe(18050);
    });

    it("aceita ponto como separador decimal quando não há vírgula", () => {
        expect(parseValorParaCentavos("180.50")).toBe(18050);
    });

    it("trata ponto como separador de milhar quando a vírgula está presente", () => {
        expect(parseValorParaCentavos("1.234,56")).toBe(123456);
    });

    it("ignora o prefixo R$ e espaços nas pontas", () => {
        expect(parseValorParaCentavos("R$ 180,50")).toBe(18050);
        expect(parseValorParaCentavos("  180,50  ")).toBe(18050);
        expect(parseValorParaCentavos("r$180,50")).toBe(18050);
    });

    it("retorna null para texto vazio", () => {
        expect(parseValorParaCentavos("")).toBeNull();
        expect(parseValorParaCentavos("   ")).toBeNull();
    });

    it("retorna null para texto que não representa um valor", () => {
        expect(parseValorParaCentavos("abc")).toBeNull();
        expect(parseValorParaCentavos("12,345")).toBeNull();
        expect(parseValorParaCentavos("12,5,6")).toBeNull();
    });

    it("retorna null para valores que não são string nem number", () => {
        expect(parseValorParaCentavos(null as unknown as string)).toBeNull();
        expect(parseValorParaCentavos(undefined as unknown as string)).toBeNull();
        expect(parseValorParaCentavos({} as unknown as string)).toBeNull();
    });
});
