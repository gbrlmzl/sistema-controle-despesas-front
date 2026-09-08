import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando, SeletorCompetenciaCarregando } from "@/components/ui/SkeletonPagina";

/* Relatórios. Espelha RelatorioResidencia: cabeçalho, seletor de mês alinhado à
   esquerda, as duas abas (residência / pessoal), o total e as seções "Por
   categoria" e "Comparado com o mês anterior".

   É a tela mais cara do app depois do painel — além das chamadas à API, ela carrega
   o Recharts, a maior dependência do bundle. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando os relatórios da competência" style={{ width: "100%" }}>

                <CabecalhoCarregando largura="8rem" />

                {/* .seletorLinha alinha à esquerda aqui, ao contrário das outras telas */}
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "1rem" }}>
                    <SeletorCompetenciaCarregando />
                </div>

                {/* .abas — duas abas dentro de uma cápsula em surface-2 */}
                <Skeleton largura="16rem" altura="2.5rem" raio="var(--r-full)" />

                <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center" }}>
                    <Skeleton largura="14rem" altura="4.1rem" raio="0.85rem" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1.5rem" }}>
                    {/* "Por categoria" — são cinco categorias fixas (RN: Alimentação,
                        Contas domésticas, Assinaturas, Lazer e Outros), então o
                        skeleton pode mostrar exatamente cinco sem chutar. */}
                    <section style={{
                        display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem",
                        borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                        <Skeleton largura="8rem" altura="1.05rem" />
                        {["Alimentação", "Contas domésticas", "Assinaturas", "Lazer", "Outros"].map((_, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                                    <Skeleton largura={["7rem", "10rem", "8rem", "5rem", "5.5rem"][i]} altura="0.9rem" />
                                    <Skeleton largura="4.5rem" altura="0.9rem" />
                                </div>
                                <Skeleton largura="100%" altura="0.3rem" raio="var(--r-full)" />
                                <Skeleton largura="25%" altura="0.72rem" />
                            </div>
                        ))}
                    </section>

                    {/* "Comparado com o mês anterior" */}
                    <section style={{
                        display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem",
                        borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                        <Skeleton largura="14rem" altura="1.05rem" />
                        <Skeleton largura="10rem" altura="1.4rem" />
                        <Skeleton largura="60%" altura="0.85rem" />
                    </section>

                    {/* Área dos gráficos do Recharts */}
                    <section style={{
                        display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem",
                        borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                        <Skeleton largura="9rem" altura="1.05rem" />
                        <Skeleton largura="100%" altura="12rem" raio="var(--r-md)" />
                    </section>
                </div>
            </AreaCarregando>
        </div>
    );
}
