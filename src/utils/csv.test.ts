import { gerarCsv } from "./csv";

const BOM = "﻿";

describe("gerarCsv", () => {
    it("gera cabeçalho e linhas separados por ponto e vírgula, cada campo entre aspas", () => {
        const csv = gerarCsv(["Nome", "Valor"], [["Ana", "10,50"]]);

        expect(csv).toBe(`${BOM}"Nome";"Valor"\r\n"Ana";"10,50"`);
    });

    it("escapa aspas duplas duplicando-as", () => {
        const csv = gerarCsv(["Descrição"], [['Almoço "combo"']]);

        expect(csv).toBe(`${BOM}"Descrição"\r\n"Almoço ""combo"""`);
    });

    it("junta múltiplas linhas com CRLF", () => {
        const csv = gerarCsv(["A"], [["1"], ["2"], ["3"]]);

        expect(csv).toBe(`${BOM}"A"\r\n"1"\r\n"2"\r\n"3"`);
    });

    it("converte valores nulos ou indefinidos em campo vazio", () => {
        const csv = gerarCsv(["A"], [[null as unknown as string, undefined as unknown as string]]);

        expect(csv).toBe(`${BOM}"A"\r\n"";""`);
    });

    it("inicia sempre com o BOM, mesmo sem linhas", () => {
        const csv = gerarCsv(["A", "B"], []);

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv).toBe(`${BOM}"A";"B"`);
    });
});
