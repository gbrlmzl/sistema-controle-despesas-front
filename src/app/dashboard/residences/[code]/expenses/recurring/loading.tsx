import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando, ListaCartoesCarregando } from "@/components/ui/SkeletonPagina";

/* Despesas recorrentes do próprio usuário. Lista curta por natureza — são as
   assinaturas e contas fixas que a pessoa marcou para repetir no mês seguinte. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando suas despesas recorrentes"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

                <CabecalhoCarregando largura="11rem" />

                <div style={{ marginTop: "0.5rem" }}>
                    <Skeleton largura="9rem" altura="1rem" />
                </div>

                <div style={{ width: "100%", marginTop: "1.75rem" }}>
                    <ListaCartoesCarregando linhas={3} comAcao />
                </div>
            </AreaCarregando>
        </div>
    );
}
