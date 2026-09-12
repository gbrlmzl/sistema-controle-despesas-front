'use client'

import { Suspense } from 'react';
import Link from 'next/link';

import { useCurrentUser } from '@/components/providers/UserProvider';
import { Skeleton } from '@/components/ui/Skeleton';
import LogoCronos from '@/components/ui/LogoCronos';
import styles from './Inicio.module.css';

/* As duas chamadas para ação são o único ponto da landing que depende da sessão.
   Isoladas em componentes próprios, o hero (título, texto e a prévia do produto)
   aparece sem esperar o GET /users/me — e ele é o conteúdo que importa aqui. */
function AcoesCabecalho() {
    const usuario = useCurrentUser();

    if (usuario) {
        return <Link href="/dashboard/residences" className={styles.botaoPrimario}>Ir para o app</Link>;
    }

    return (
        <div className={styles.cabecalhoAcoes}>
            <Link href="/login" className={styles.botaoTexto}>Entrar</Link>
            <Link href="/register" className={styles.botaoPrimario}>Criar conta</Link>
        </div>
    );
}

function AcoesHero() {
    const usuario = useCurrentUser();

    if (usuario) {
        return <Link href="/dashboard/residences" className={styles.botaoPrimario}>Começar a utilizar</Link>;
    }

    return (
        <>
            <Link href="/register" className={styles.botaoPrimario}>Criar conta grátis</Link>
            <Link href="/login" className={styles.botaoSecundario}>Já tenho conta</Link>
        </>
    );
}

/* Os fallbacks reservam a área do estado DESLOGADO — que é o de quase todo mundo
   que chega numa landing pública. Assim o caso comum não tem salto nenhum quando a
   sessão resolve; o visitante já logado vê os botões encolherem uma vez, o que é
   preferível a mostrar "Criar conta" para quem já tem conta. */
function AcoesCabecalhoCarregando() {
    return (
        <div className={styles.cabecalhoAcoes} aria-hidden="true">
            <Skeleton largura="5.5rem" altura="2.3rem" raio="var(--r-md)" />
            <Skeleton largura="8.5rem" altura="2.4rem" raio="var(--r-md)" />
        </div>
    );
}

function AcoesHeroCarregando() {
    return (
        <>
            <Skeleton largura="11rem" altura="2.4rem" raio="var(--r-md)" />
            <Skeleton largura="9.5rem" altura="2.4rem" raio="var(--r-md)" />
        </>
    );
}

export default function Inicio() {
    return (
        <div className={styles.pagina}>
            <header className={styles.cabecalho}>
                <Link href="/" className={styles.marca}>
                    <span className={styles.marcaIcone}><LogoCronos /></span>
                    Cronos
                </Link>

                <Suspense fallback={<AcoesCabecalhoCarregando />}>
                    <AcoesCabecalho />
                </Suspense>
            </header>

            <main className={styles.hero}>
                <div className={styles.heroTexto}>
                    <h1>Ninguém mais pergunta &ldquo;quanto eu devo?&rdquo;</h1>
                    <p>
                        Cada morador lança o que pagou. O Cronos calcula a cota de cada um,
                        mostra quem paga e quem recebe, e fecha o mês sem planilha nem discussão no grupo.
                    </p>

                    <div className={styles.heroAcoes}>
                        <Suspense fallback={<AcoesHeroCarregando />}>
                            <AcoesHero />
                        </Suspense>
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
