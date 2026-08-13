import { despesaSchema } from "./despesas";

function despesaValida() {
    return {
        name: "Supermercado",
        valueInCents: 5000,
        category: "ALIMENTACAO" as const,
        isRecurring: false,
    };
}

describe("despesaSchema", () => {
    it("aceita uma despesa válida", () => {
        const resultado = despesaSchema.safeParse(despesaValida());
        expect(resultado.success).toBe(true);
    });

    it("rejeita nome com menos de 2 caracteres", () => {
        const resultado = despesaSchema.safeParse({ ...despesaValida(), name: "A" });
        expect(resultado.success).toBe(false);
    });

    it("rejeita nome com mais de 60 caracteres", () => {
        const resultado = despesaSchema.safeParse({ ...despesaValida(), name: "A".repeat(61) });
        expect(resultado.success).toBe(false);
    });

    it("rejeita valueInCents não inteiro", () => {
        const resultado = despesaSchema.safeParse({ ...despesaValida(), valueInCents: 50.5 });
        expect(resultado.success).toBe(false);
    });

    it("rejeita valueInCents zero ou negativo", () => {
        expect(despesaSchema.safeParse({ ...despesaValida(), valueInCents: 0 }).success).toBe(false);
        expect(despesaSchema.safeParse({ ...despesaValida(), valueInCents: -100 }).success).toBe(false);
    });

    it("rejeita categoria fora do conjunto permitido", () => {
        const resultado = despesaSchema.safeParse({ ...despesaValida(), category: "VIAGEM" });
        expect(resultado.success).toBe(false);
    });
});
