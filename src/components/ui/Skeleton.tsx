import type { CSSProperties, ReactNode } from "react";
import styles from "./Skeleton.module.css";

/* Primitivas usadas pelos loading.tsx e pelos fallbacks de <Suspense>.
   São Server Components (sem "use client"): um skeleton não tem interação nenhuma,
   e mantê-los no servidor evita mandar JS pro navegador só pra desenhar um bloco
   cinza — o que seria contraproducente numa mudança que existe pra acelerar a tela. */

interface SkeletonProps {
    /** Largura CSS. Aceita %, rem, ch — o que couber no contexto. Padrão: 100%. */
    largura?: string;
    /** Altura CSS. Padrão: a altura de uma linha de texto (ver .texto). */
    altura?: string;
    /** Raio da borda. Use os tokens do projeto: var(--r-md), var(--r-full)… */
    raio?: string;
    /** Círculo perfeito (avatares, botões de ícone). Ignora `raio`. */
    circulo?: boolean;
    className?: string;
    style?: CSSProperties;
}

export function Skeleton({ largura, altura, raio, circulo, className, style }: SkeletonProps) {
    const classes = [styles.bloco, styles.animado, circulo ? styles.circulo : "", className]
        .filter(Boolean)
        .join(" ");

    return (
        <span
            aria-hidden="true"
            className={classes}
            style={{
                display: "block",
                width: largura ?? "100%",
                height: altura ?? "1rem",
                ...(circulo ? {} : raio ? { borderRadius: raio } : {}),
                ...style,
            }}
        />
    );
}

interface SkeletonTextoProps {
    /** Largura da linha. Varie entre linhas para não virar um retângulo sólido. */
    largura?: string;
    /** Altura da linha; por padrão acompanha o font-size do contexto. */
    altura?: string;
    className?: string;
}

/** Uma linha de texto. Herda o tamanho da fonte do contexto onde é colocada. */
export function SkeletonTexto({ largura = "100%", altura, className }: SkeletonTextoProps) {
    const classes = [styles.bloco, styles.animado, styles.texto, className].filter(Boolean).join(" ");
    return (
        <span
            aria-hidden="true"
            className={classes}
            style={{ display: "block", width: largura, ...(altura ? { height: altura } : {}) }}
        />
    );
}

interface AreaCarregandoProps {
    children: ReactNode;
    /** O que o leitor de tela anuncia. Seja específico: "Carregando acertos". */
    rotulo: string;
    className?: string;
    style?: CSSProperties;
}

/* Envolve um conjunto de skeletons. Os blocos são aria-hidden; é este wrapper que
   comunica o estado — role="status" + aria-busy fazem o leitor de tela anunciar
   "Carregando…" uma vez, em vez de ler dezenas de elementos vazios. */
export function AreaCarregando({ children, rotulo, className, style }: AreaCarregandoProps) {
    return (
        <div role="status" aria-busy="true" aria-live="polite" className={className} style={style}>
            <span className={styles.somenteLeitorDeTela}>{rotulo}</span>
            {children}
        </div>
    );
}
