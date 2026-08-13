import { normalizeResidenceCode } from "./residenceCode";

describe("normalizeResidenceCode", () => {
    it("converte para maiúsculas", () => {
        expect(normalizeResidenceCode("ab12cd")).toBe("AB12CD");
    });

    it("remove espaços nas pontas", () => {
        expect(normalizeResidenceCode("  AB12CD  ")).toBe("AB12CD");
    });

    it("mantém um código já normalizado sem alterações", () => {
        expect(normalizeResidenceCode("AB12CD")).toBe("AB12CD");
    });

    it("retorna string vazia para valores que não são string", () => {
        expect(normalizeResidenceCode(null)).toBe("");
        expect(normalizeResidenceCode(undefined)).toBe("");
        expect(normalizeResidenceCode(123456)).toBe("");
    });
});
