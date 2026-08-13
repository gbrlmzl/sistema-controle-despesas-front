import { addDays, subHours } from "date-fns";
import { formatarMomento } from "./formatarMomento";

const AGORA = new Date("2026-08-10T12:00:00.000Z");

describe("formatarMomento", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(AGORA);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("retorna string vazia quando não há data", () => {
        expect(formatarMomento(null)).toBe("");
        expect(formatarMomento(undefined)).toBe("");
    });

    it("formata um momento no passado como tempo relativo com sufixo 'há'", () => {
        const duasHorasAtras = subHours(AGORA, 2);
        expect(formatarMomento(duasHorasAtras)).toBe("há 2 horas");
    });

    it("formata um momento no futuro com sufixo 'em'", () => {
        const emTresDias = addDays(AGORA, 3);
        expect(formatarMomento(emTresDias)).toBe("em 3 dias");
    });

    it("aceita string ISO e timestamp numérico, além de Date", () => {
        const duasHorasAtras = subHours(AGORA, 2);
        expect(formatarMomento(duasHorasAtras.toISOString())).toBe("há 2 horas");
        expect(formatarMomento(duasHorasAtras.getTime())).toBe("há 2 horas");
    });
});
