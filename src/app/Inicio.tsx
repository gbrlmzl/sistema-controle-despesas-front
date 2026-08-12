'use client'

import Link from 'next/link';

import { useCurrentUser } from '@/components/providers/UserProvider';
import styles from './Inicio.module.css';

export default function Inicio() {
    const usuario = useCurrentUser();

    return (
        <div className={styles.pagina}>
            <header className={styles.cabecalho}>
                <Link href="/" className={styles.marca}>
                    <span className={styles.marcaIcone}>C</span>
                    Cronos
                </Link>

                {usuario ? (
                    <Link href="/dashboard/residences" className={styles.botaoPrimario}>Ir para o app</Link>
                ) : (
                    <div className={styles.cabecalhoAcoes}>
                        <Link href="/login" className={styles.botaoTexto}>Entrar</Link>
                        <Link href="/cadastro" className={styles.botaoPrimario}>Criar conta</Link>
                    </div>
                )}
            </header>

            <main className={styles.hero}>
                <div className={styles.heroTexto}>
                    <span className={styles.selo}>Despesas compartilhadas</span>
                    <h1>Ninguém mais pergunta &ldquo;quanto eu devo?&rdquo;</h1>
                    <p>
                        Cada morador lança o que pagou. O Cronos calcula a cota de cada um,
                        mostra quem paga e quem recebe, e fecha o mês sem planilha nem discussão no grupo.
                    </p>

                    <div className={styles.heroAcoes}>
                        {usuario ? (
                            <Link href="/dashboard/residences" className={styles.botaoPrimario}>Começar a utilizar</Link>
                        ) : (
                            <>
                                <Link href="/cadastro" className={styles.botaoPrimario}>Criar conta grátis</Link>
                                <Link href="/login" className={styles.botaoSecundario}>Já tenho conta</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Uma prévia do produto explica melhor do que uma ilustração genérica */}
                <div className={styles.previa} aria-hidden="true">
                    <div className={styles.previaTopo}>
                        <span className={styles.previaRotulo}>Agosto · Rep. Vila Mariana</span>
                        <span className={`${styles.previaTotal} num`}>R$ 3.284,70</span>
                    </div>

                    <ul className={styles.previaLista}>
                        <li>
                            <span className={styles.previaAvatar} style={{ background: 'var(--cat-2)' }}>MC</span>
                            <span className={styles.previaNome}>Marina</span>
                            <span className={`${styles.previaRecebe} num`}>recebe R$ 147,22</span>
                        </li>
                        <li>
                            <span className={styles.previaAvatar} style={{ background: 'var(--cat-3)' }}>TS</span>
                            <span className={styles.previaNome}>Thiago</span>
                            <span className={`${styles.previaPaga} num`}>paga R$ 108,68</span>
                        </li>
                        <li>
                            <span className={styles.previaAvatar} style={{ background: 'var(--cat-4)' }}>LR</span>
                            <span className={styles.previaNome}>Letícia</span>
                            <span className={`${styles.previaPaga} num`}>paga R$ 365,28</span>
                        </li>
                    </ul>

                    <p className={`${styles.previaRodape} num`}>Cota individual de R$ 821,18</p>
                </div>
            </main>

            <footer className={styles.rodape}>
                <a href="https://github.com/gbrlmzl" target="_blank" rel="noopener noreferrer">github.com/gbrlmzl</a>
            </footer>
        </div>
    )
}
