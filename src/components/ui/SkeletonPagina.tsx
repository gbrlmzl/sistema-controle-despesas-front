import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";
import styles from "./SkeletonPagina.module.css";

/* Peças que se repetem entre os loading.tsx das telas de residência. Todas são
   Server Components — ver a nota em Skeleton.tsx sobre não mandar JS pro
   navegador só para desenhar bloco cinza. */

/**
 * Cabeçalho "voltar · título · ação", presente em Membros, Acertos, Despesas,
 * Relatórios e Configurações. `comAcao` reserva o canto direito quando a tela
 * tem botão ali (Membros tem; Acertos não).
 */
export function CabecalhoCarregando({ largura = "7rem", comAcao = false }: { largura?: string; comAcao?: boolean }) {
    return (
        <div className={styles.cabecalho}>
            <Skeleton largura="2.25rem" altura="2.25rem" raio="var(--r-md)" />
            <div className={styles.tituloCentral}>
                {/* 1.35rem é o font-size do h2 em .cabecalhoPagina */}
                <Skeleton largura={largura} altura="1.35rem" />
            </div>
            {comAcao
                ? <Skeleton largura="2.25rem" altura="2.25rem" raio="var(--r-md)" />
                : <span className={styles.canto} />}
        </div>
    );
}

/** A pílula de mês usada por Despesas, Relatórios e Acertos. */
export function SeletorCompetenciaCarregando() {
    return (
        <div className={styles.seletor}>
            <Skeleton largura="12rem" altura="2.6rem" raio="var(--r-full)" />
        </div>
    );
}

/** Card de seção (padding 1.25rem, surface, borda) com um título opcional. */
export function SecaoCarregando({ titulo, children }: { titulo?: string; children: ReactNode }) {
    return (
        <section className={styles.secao}>
            {titulo !== undefined && <Skeleton largura={titulo} altura="1.05rem" />}
            {children}
        </section>
    );
}

/**
 * Lista de cartões em surface-2 (padrão de ListaMembros e da lista de residências).
 * `linhas` controla quantos itens aparecem — use um número próximo do que a tela
 * costuma mostrar, não um número grande: um skeleton mais alto que o conteúdo real
 * encolhe a página quando os dados chegam.
 */
export function ListaCartoesCarregando({ linhas = 3, comAcao = false }: { linhas?: number; comAcao?: boolean }) {
    //Larguras variadas: nomes reais não têm todos o mesmo tamanho, e uma coluna de
    //blocos idênticos denuncia o placeholder mais do que ajuda.
    const larguras = ["58%", "42%", "68%", "50%", "62%"];

    return (
        <ul className={styles.listaCartoes}>
            {Array.from({ length: linhas }, (_, i) => (
                <li key={i} className={styles.cartao}>
                    <span className={styles.cartaoInfo}>
                        <Skeleton largura={larguras[i % larguras.length]} altura="1rem" />
                        <Skeleton largura="32%" altura="0.8rem" />
                    </span>
                    {comAcao && <Skeleton largura="2rem" altura="2rem" raio="var(--r-full)" />}
                </li>
            ))}
        </ul>
    );
}

/**
 * Lista separada por bordas, com um valor à direita (padrão dos acertos e da
 * atividade recente).
 */
export function ListaLinhasCarregando({ linhas = 3 }: { linhas?: number }) {
    const larguras = ["64%", "48%", "56%", "40%"];

    return (
        <ul className={styles.pilha}>
            {Array.from({ length: linhas }, (_, i) => (
                <li key={i} className={styles.linhaLista}>
                    <span className={styles.linhaTopo}>
                        <Skeleton largura={larguras[i % larguras.length]} altura="0.95rem" />
                        <Skeleton largura="4.5rem" altura="0.95rem" />
                    </span>
                    <Skeleton largura="35%" altura="0.75rem" />
                </li>
            ))}
        </ul>
    );
}

export { styles as skeletonPaginaStyles };
