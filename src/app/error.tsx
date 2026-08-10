"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ErrorFallback.module.css";

//Captura qualquer erro não tratado de uma página/Server Component desta árvore
//(ex.: a API fora do ar ao carregar uma residência) — sem isso, a falha derrubava a
//rota inteira com a tela de erro genérica do Next.js, sem opção de tentar de novo.
//Não cobre o layout raiz (src/app/layout.tsx) — para isso existe global-error.tsx.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const router = useRouter();

    useEffect(() => {
        console.error("Erro não tratado numa página:", error);
    }, [error]);

    //reset() sozinho só refaz a renderização local — se o Router Cache já guardou o
    //payload que falhou, "tentar de novo" reexibiria o mesmo erro. router.refresh()
    //força a Next.js buscar os dados de novo no servidor antes do reset().
    const tentarDeNovo = () => {
        router.refresh();
        reset();
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.titulo}>Não foi possível carregar esta página</h2>
            <p className={styles.mensagem}>
                Pode ser uma instabilidade temporária na conexão com o servidor. Tente de novo em
                alguns instantes.
            </p>
            <div className={styles.acoes}>
                <button type="button" className={styles.botao} onClick={tentarDeNovo}>
                    Tentar de novo
                </button>
                <Link href="/" className={styles.botaoSecundario}>
                    Voltar ao início
                </Link>
            </div>
        </div>
    );
}
