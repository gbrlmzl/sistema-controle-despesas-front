import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { ListaCartoesCarregando } from "@/components/ui/SkeletonPagina";

/* Lista de residências. Diferente das telas de dentro da residência, esta busca os
   dados no cliente (useResidencias), então o servidor já responde rápido e este
   skeleton aparece por pouco tempo. Ele existe mesmo assim por dois motivos: cobre
   a janela do carregamento inicial da rota, e mantém o comportamento uniforme —
   nenhuma tela de /dashboard fica sem resposta visual ao clique. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando suas residências" style={{ width: "100%" }}>
                {/* .cabecalho: h1 "Residências" + os dois botões de ação */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem",
                }}>
                    <Skeleton largura="10rem" altura="1.6rem" />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Skeleton largura="9.5rem" altura="2.5rem" raio="var(--r-md)" />
                        <Skeleton largura="11rem" altura="2.5rem" raio="var(--r-md)" />
                    </div>
                </div>

                <ListaCartoesCarregando linhas={2} comAcao />
            </AreaCarregando>
        </div>
    );
}
