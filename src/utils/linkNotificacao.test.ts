import { linkNotificacao } from "./linkNotificacao";

describe("linkNotificacao", () => {
    it("retorna o destino padrão quando linkTo é null", () => {
        expect(linkNotificacao(null)).toBe("/dashboard/residences");
    });

    it("retorna o destino padrão quando linkTo é exatamente /app", () => {
        expect(linkNotificacao("/app")).toBe("/dashboard/residences");
    });

    it("traduz links antigos de /app/** para /dashboard/**", () => {
        expect(linkNotificacao("/app/residences/ABC123")).toBe("/dashboard/residences/ABC123");
    });

    it("mantém links que já estão no formato novo", () => {
        expect(linkNotificacao("/dashboard/residences/ABC123")).toBe("/dashboard/residences/ABC123");
    });
});
