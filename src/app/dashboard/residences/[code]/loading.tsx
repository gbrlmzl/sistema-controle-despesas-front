import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import styles from "./loading.module.css";

/* Painel da residência. É a tela com mais dado do app — três chamadas à API em
   cascata (detalhe, despesas da competência, relatório) — e por isso a que mais
   ganha com um skeleton: antes desta mudança, o clique em "entrar na residência"
   deixava a tela anterior parada por ~385 ms sem nenhum sinal de que algo estava
   acontecendo.

   A estrutura abaixo é a de PainelResidencia + ResumoDoMes, na mesma ordem e com
   as mesmas medidas, para que a troca do skeleton pelo conteúdo não desloque nada. */
export default function Carregando() {
    return (
        <AreaCarregando rotulo="Carregando o painel da residência" className={styles.container}>
            <header className={styles.cabecalho}>
                <div className={styles.identidade}>
                    <div className={styles.tituloLinha}>
                        {/* .botaoVoltar tem 2rem, não 2.25rem como os outros cantos */}
                        <Skeleton largura="2rem" altura="2rem" raio="var(--r-md)" />
                        <Skeleton largura="11rem" altura="1.5rem" />
                    </div>
                    <div className={styles.meta}>
                        {/* Código da residência: 6 caracteres com letter-spacing largo */}
                        <Skeleton largura="5.5rem" altura="1.15rem" raio="var(--r-sm)" />
                        <Skeleton largura="7rem" altura="0.78rem" />
                    </div>
                </div>
                <Skeleton largura="2.25rem" altura="2.25rem" raio="var(--r-md)" />
            </header>

            <div className={styles.resumo}>
                <div className={styles.linhaCards}>
                    {/* Card de saldo — o número que o usuário abriu o app pra ver */}
                    <section className={`${styles.card} ${styles.cardSaldo}`}>
                        <Skeleton largura="8rem" altura="0.68rem" />
                        <div style={{ marginTop: "0.5rem" }}>
                            <Skeleton largura="9.5rem" altura="2.1rem" />
                        </div>
                        <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            <Skeleton largura="100%" altura="0.82rem" />
                            <Skeleton largura="72%" altura="0.82rem" />
                        </div>
                    </section>

                    {/* Card de total da casa — número + sparkline das 6 competências */}
                    <section className={styles.card}>
                        <Skeleton largura="9rem" altura="0.68rem" />
                        <div style={{ marginTop: "0.5rem" }}>
                            <Skeleton largura="8rem" altura="1.85rem" />
                        </div>
                        <div style={{ marginTop: "0.35rem" }}>
                            <Skeleton largura="60%" altura="0.76rem" />
                        </div>
                        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                            {/* .sparkline tem 3.5rem de altura fixa */}
                            <Skeleton largura="100%" altura="3.5rem" raio="var(--r-sm)" />
                            <div className={styles.graficoRotulos}>
                                {Array.from({ length: 6 }, (_, i) => (
                                    <Skeleton key={i} largura="1.6rem" altura="0.65rem" />
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* "Setembro de 2026 · quem lançou quanto" */}
                <section className={styles.secao}>
                    <Skeleton largura="16rem" altura="1.05rem" />
                    <div className={styles.listaMembros}>
                        {["58%", "44%", "66%"].map((largura, i) => (
                            <div key={i} className={styles.membro}>
                                <span className={styles.membroTopo}>
                                    <Skeleton largura={largura} altura="0.85rem" />
                                    <Skeleton largura="4.5rem" altura="0.85rem" />
                                </span>
                                {/* .barraFundo: 0.3rem de altura, cantos totalmente arredondados */}
                                <Skeleton largura="100%" altura="0.3rem" raio="var(--r-full)" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Atividade recente — no máximo 5 itens (LIMITE_ATIVIDADE_RECENTE) */}
                <section className={styles.secao}>
                    <Skeleton largura="5.5rem" altura="1.05rem" />
                    <div className={styles.listaAtividade}>
                        {["62%", "48%", "70%", "54%"].map((largura, i) => (
                            <div key={i} className={styles.atividade}>
                                {/* .atividadeDot: 8px */}
                                <Skeleton largura="8px" altura="8px" circulo />
                                <span className={styles.atividadeGrow}>
                                    <Skeleton largura={largura} altura="0.85rem" />
                                    <Skeleton largura="38%" altura="0.72rem" />
                                </span>
                                <Skeleton largura="4.5rem" altura="0.85rem" />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AreaCarregando>
    );
}
