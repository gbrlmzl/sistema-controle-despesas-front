import { linkNotificacao } from "./linkNotificacao";
import { NotificationType } from "@/types/notificationType";

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

    it("traduz o linkTo de SETTLEMENT_PENDING/SETTLEMENT_READY para a tela de acertos", () => {
        expect(linkNotificacao("/app/residences/ABC123/settlements?mes=8&ano=2026"))
            .toBe("/dashboard/residences/ABC123/settlements?mes=8&ano=2026");
    });

    it("redireciona JOIN_REQUEST_RECEIVED para a tela de convites e solicitações", () => {
        expect(linkNotificacao("/dashboard/residences/ABC123", NotificationType.JOIN_REQUEST_RECEIVED))
            .toBe("/dashboard/residences/ABC123/members/requests");
    });

    it("traduz e redireciona JOIN_REQUEST_RECEIVED mesmo no formato antigo /app/**", () => {
        expect(linkNotificacao("/app/residences/ABC123", NotificationType.JOIN_REQUEST_RECEIVED))
            .toBe("/dashboard/residences/ABC123/members/requests");
    });

    it("não mexe no destino de outros tipos de notificação", () => {
        expect(linkNotificacao("/dashboard/residences/ABC123", NotificationType.JOIN_REQUEST_ACCEPTED))
            .toBe("/dashboard/residences/ABC123");
    });

    it("cai no destino padrão quando JOIN_REQUEST_RECEIVED não traz um código de residência", () => {
        expect(linkNotificacao(null, NotificationType.JOIN_REQUEST_RECEIVED)).toBe("/dashboard/residences");
    });
});
