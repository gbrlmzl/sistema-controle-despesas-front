import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import {
    CabecalhoCarregando, SeletorCompetenciaCarregando, ListaLinhasCarregando,
} from "@/components/ui/SkeletonPagina";

/* Acertos. É a tela de destino da navegação que motivou esta mudança e a mais
   pesada do conjunto: três saltos sequenciais até a API (detalhe + sessão +
   competências, depois o fechamento). Medimos 354 ms de tela congelada saindo de
   Membros — este arquivo é o que troca esses 354 ms por conteúdo visível.

   Estrutura espelhada de AcertosDaCompetencia: cabeçalho, seletor de competência,
   linha de meta do fechamento e as duas seções de lista. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando os acertos da competência"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "0.85rem" }}>

                {/* Sem ação no canto direito: a tela usa .espacoCanto ali */}
                <CabecalhoCarregando largura="6rem" />

                <SeletorCompetenciaCarregando />

                {/* .metaFechamento — 0.8rem, centralizado, em ink-3 */}
                <Skeleton largura="16rem" altura="0.8rem" />

                {/* "Seus acertos" — só aparece quando o usuário está em alguma linha,
                    e é a seção que ele veio ver. Duas linhas é o caso comum. */}
                <section style={{
                    display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%",
                    padding: "1.25rem", borderRadius: "var(--r-lg)",
                    background: "var(--surface)", border: "1px solid var(--border)",
                }}>
                    <Skeleton largura="7.5rem" altura="1.05rem" />
                    <ListaLinhasCarregando linhas={2} />
                </section>

                {/* "Todos os acertos do mês" */}
                <section style={{
                    display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%",
                    padding: "1.25rem", borderRadius: "var(--r-lg)",
                    background: "var(--surface)", border: "1px solid var(--border)",
                }}>
                    <Skeleton largura="11rem" altura="1.05rem" />
                    <ListaLinhasCarregando linhas={3} />
                </section>
            </AreaCarregando>
        </div>
    );
}
