import { periodoAAAAMM, ultimaCompetenciaFechada } from "./competencia";
import type { CompetenciaComDespesas } from "@/types/residencia";

const competencia = (month: number, year: number, isClosed: boolean): CompetenciaComDespesas =>
    ({ month, year, temDespesas: true, isClosed });

describe("periodoAAAAMM", () => {
    it("preenche o mês com zero à esquerda", () => {
        expect(periodoAAAAMM({ month: 8, year: 2026 })).toBe("2026-08");
    });

    it("mantém o mês de dois dígitos", () => {
        expect(periodoAAAAMM({ month: 12, year: 2026 })).toBe("2026-12");
    });
});

//A entrada pela navbar não traz ?mes&ano: sem um padrão válido a tela de acertos
//caía em notFound() sempre. O padrão precisa ser a última FECHADA -- nunca a aberta.
describe("ultimaCompetenciaFechada", () => {
    it("devolve null quando não há nenhuma competência", () => {
        expect(ultimaCompetenciaFechada([])).toBeNull();
    });

    it("devolve null quando existem competências, mas nenhuma fechada", () => {
        expect(ultimaCompetenciaFechada([
            competencia(7, 2026, false),
            competencia(8, 2026, false),
        ])).toBeNull();
    });

    it("ignora as competências abertas, mesmo sendo mais recentes", () => {
        expect(ultimaCompetenciaFechada([
            competencia(6, 2026, true),
            competencia(8, 2026, false),
        ])).toEqual({ month: 6, year: 2026 });
    });

    it("escolhe a fechada mais recente independentemente da ordem da lista", () => {
        expect(ultimaCompetenciaFechada([
            competencia(3, 2026, true),
            competencia(7, 2026, true),
            competencia(5, 2026, true),
        ])).toEqual({ month: 7, year: 2026 });
    });

    it("compara atravessando a virada de ano", () => {
        expect(ultimaCompetenciaFechada([
            competencia(1, 2026, true),
            competencia(12, 2025, true),
        ])).toEqual({ month: 1, year: 2026 });
    });

    it("não devolve os campos extras de CompetenciaComDespesas", () => {
        expect(ultimaCompetenciaFechada([competencia(4, 2026, true)]))
            .toEqual({ month: 4, year: 2026 });
    });
});
