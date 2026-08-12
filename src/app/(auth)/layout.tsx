import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./layout.module.css";

//Login e cadastro compartilham a mesma moldura: apresentação à esquerda no desktop,
//só o formulário no mobile. Não há navegação aqui — quem chega nesta área ainda
//não tem sessão, e o proxy (src/proxy.ts) manda logado de volta para a raiz.
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.layout}>
            <aside className={styles.pitch}>
                <Link href="/" className={styles.pitchMarca}>
                    <span className={styles.pitchIcone}>C</span>
                    Cronos
                </Link>

                <div className={styles.pitchMeio}>
                    <h2>A conta da casa, resolvida em um número.</h2>
                    <p>
                        Cada morador lança o que pagou. No fim do mês o Cronos diz
                        quem paga quem — e quanto.
                    </p>
                </div>

                <div className={styles.previa} aria-hidden="true">
                    <span className={styles.previaRotulo}>Fechamento de julho</span>
                    <ul className={styles.previaLista}>
                        <li>
                            <span className={styles.previaAvatar} style={{ background: 'var(--cat-2)' }}>MC</span>
                            <span className={styles.previaNome}>Marina</span>
                            <span className={`${styles.previaRecebe} num`}>recebe R$ 214,10</span>
                        </li>
                        <li>
                            <span className={styles.previaAvatar} style={{ background: 'var(--cat-4)' }}>LR</span>
                            <span className={styles.previaNome}>Letícia</span>
                            <span className={`${styles.previaPaga} num`}>paga R$ 214,10</span>
                        </li>
                    </ul>
                </div>
            </aside>

            <div className={styles.formulario}>
                <div className={styles.formularioInterno}>
                    <Link href="/" className={styles.marcaMobile}>
                        <span className={styles.pitchIcone}>C</span>
                        Cronos
                    </Link>

                    {children}
                </div>
            </div>
        </div>
    );
}
