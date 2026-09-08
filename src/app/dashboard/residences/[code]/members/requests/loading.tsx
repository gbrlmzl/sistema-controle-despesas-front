import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando, ListaCartoesCarregando } from "@/components/ui/SkeletonPagina";

/* Convites e solicitações. Espelha SolicitacoesConvites: cabeçalho, nome da
   residência e as duas seções — "Solicitações de entrada" e "Convites enviados".

   As duas listas costumam estar vazias (o estado normal é não ter pendência), então
   o skeleton mostra só uma linha por seção: o suficiente para comunicar "estou
   buscando" sem prometer conteúdo que quase nunca existe. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando convites e solicitações"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

                <CabecalhoCarregando largura="14rem" />

                <div style={{ marginTop: "0.5rem" }}>
                    <Skeleton largura="9rem" altura="1rem" />
                </div>

                <div style={{ width: "100%", marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <section style={{
                        display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem",
                        borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                        <Skeleton largura="12rem" altura="1.05rem" />
                        <ListaCartoesCarregando linhas={1} comAcao />
                    </section>

                    <section style={{
                        display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem",
                        borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                        <Skeleton largura="10.5rem" altura="1.05rem" />
                        <ListaCartoesCarregando linhas={1} comAcao />
                    </section>
                </div>
            </AreaCarregando>
        </div>
    );
}
