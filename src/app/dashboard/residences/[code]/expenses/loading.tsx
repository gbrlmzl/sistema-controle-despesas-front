import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando, SeletorCompetenciaCarregando } from "@/components/ui/SkeletonPagina";

/* Despesas da competência. Espelha ConsultaDespesas: cabeçalho, seletor de mês,
   atalho de recorrentes, o total em destaque e os grupos por membro (cada grupo é
   um cabeçalho clicável com nome e total). */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando as despesas da competência"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

                <CabecalhoCarregando largura="7rem" />

                <div style={{ marginTop: "0.85rem", width: "100%" }}>
                    <SeletorCompetenciaCarregando />
                </div>

                {/* .botaoRecorrentes — pílula de 2.5rem de raio, centralizada */}
                <div style={{ marginTop: "0.5rem" }}>
                    <Skeleton largura="13rem" altura="2.3rem" raio="2.5rem" />
                </div>

                {/* .totalGeral é um bloco em accent; no skeleton fica neutro de
                    propósito — pintar de accent leria como dado já carregado. */}
                <div style={{ marginTop: "1.25rem" }}>
                    <Skeleton largura="14rem" altura="4.1rem" raio="0.85rem" />
                </div>

                {/* Grupos por membro: cabeçalho com nome à esquerda e total à direita,
                    separados por uma borda inferior (.grupoCabecalho). */}
                <div style={{ width: "100%", marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {["9rem", "7rem", "10rem"].map((largura, i) => (
                        <div key={i} style={{ width: "100%" }}>
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                gap: "0.5rem", paddingBottom: "0.25rem", borderBottom: "1px solid var(--border)",
                            }}>
                                <Skeleton largura={largura} altura="1rem" />
                                <Skeleton largura="5rem" altura="1rem" />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem" }}>
                                {["70%", "52%"].map((l, j) => (
                                    <div key={j} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                                        <span style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 0 }}>
                                            <Skeleton largura={l} altura="0.9rem" />
                                            <Skeleton largura="30%" altura="0.72rem" />
                                        </span>
                                        <Skeleton largura="4.5rem" altura="0.9rem" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </AreaCarregando>
        </div>
    );
}
