import { criarResidenciaSchema, entrarResidenciaSchema, residenceCodeSchema, residenceNameSchema } from "./residencias";

describe("residenceNameSchema", () => {
    it("aceita letras, números e espaços", () => {
        expect(residenceNameSchema.safeParse("Casa 2 da Praia").success).toBe(true);
    });

    it("rejeita menos de 3 caracteres", () => {
        expect(residenceNameSchema.safeParse("Ab").success).toBe(false);
    });

    it("rejeita mais de 40 caracteres", () => {
        expect(residenceNameSchema.safeParse("A".repeat(41)).success).toBe(false);
    });

    it("rejeita símbolos fora de letras, números e espaços", () => {
        expect(residenceNameSchema.safeParse("Casa da Praia!").success).toBe(false);
        expect(residenceNameSchema.safeParse("Casa-da-Praia").success).toBe(false);
    });

    it("remove espaços nas pontas antes de validar", () => {
        const resultado = residenceNameSchema.safeParse("  Casa da Praia  ");
        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.data).toBe("Casa da Praia");
        }
    });
});

describe("criarResidenciaSchema", () => {
    it("aceita um nome válido dentro do objeto", () => {
        expect(criarResidenciaSchema.safeParse({ name: "Casa da Praia" }).success).toBe(true);
    });
});

describe("residenceCodeSchema", () => {
    it("aceita exatamente 6 caracteres alfanuméricos maiúsculos", () => {
        expect(residenceCodeSchema.safeParse("AB12CD").success).toBe(true);
    });

    it("rejeita códigos com menos ou mais de 6 caracteres", () => {
        expect(residenceCodeSchema.safeParse("AB12C").success).toBe(false);
        expect(residenceCodeSchema.safeParse("AB12CDE").success).toBe(false);
    });

    it("rejeita letras minúsculas ou caracteres fora de A-Z0-9", () => {
        expect(residenceCodeSchema.safeParse("ab12cd").success).toBe(false);
        expect(residenceCodeSchema.safeParse("AB12-D").success).toBe(false);
    });
});

describe("entrarResidenciaSchema", () => {
    it("aceita um código válido dentro do objeto", () => {
        expect(entrarResidenciaSchema.safeParse({ code: "AB12CD" }).success).toBe(true);
    });
});
