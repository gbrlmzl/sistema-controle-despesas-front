const DESTINO_PADRAO = "/dashboard/residences";

//A área autenticada morava em /app/** e passou a ser /dashboard/** (commit ffec5ad).
//As notificações já gravadas — e as que a API ainda gerar no formato antigo — trazem
//`linkTo` apontando para /app, que hoje é 404. A tradução acontece aqui, na leitura,
//porque o registro no banco continua com o valor original.
export function linkNotificacao(linkTo: string | null): string {
    if (!linkTo) {
        return DESTINO_PADRAO;
    }

    if (linkTo === "/app") {
        return DESTINO_PADRAO;
    }

    if (linkTo.startsWith("/app/")) {
        return `/dashboard/${linkTo.slice("/app/".length)}`;
    }

    return linkTo;
}
