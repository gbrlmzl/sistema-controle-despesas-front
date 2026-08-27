import { NotificationType } from "@/types/notificationType";

const DESTINO_PADRAO = "/dashboard/residences";

//A área autenticada morava em /app/** e passou a ser /dashboard/** (commit ffec5ad).
//As notificações já gravadas — e as que a API ainda gerar no formato antigo — trazem
//`linkTo` apontando para /app, que hoje é 404. A tradução acontece aqui, na leitura,
//porque o registro no banco continua com o valor original.
export function linkNotificacao(linkTo: string | null, type?: NotificationType): string {
    if (!linkTo || linkTo === "/app") {
        return DESTINO_PADRAO;
    }

    const destino = linkTo.startsWith("/app/")
        ? `/dashboard/${linkTo.slice("/app/".length)}`
        : linkTo;

    //CA-10 da US-016 -> uma solicitação de entrada leva à tela onde o owner a
    //responde. A API ainda aponta para o painel da residência — onde essa ação
    //morava antes de ganhar tela própria em /members/requests —, então a tradução
    //do destino também acontece aqui, no mesmo lugar que já resolve /app -> /dashboard.
    if (type === NotificationType.JOIN_REQUEST_RECEIVED) {
        const codigo = destino.match(/^\/dashboard\/residences\/([^/?]+)/)?.[1];
        if (codigo) {
            return `/dashboard/residences/${codigo}/members/requests`;
        }
    }

    return destino;
}
