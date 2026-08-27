'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";

import SeletorCompetencia from "../expenses/SeletorCompetencia";
import { competenciaTexto } from "@/utils/categorias";
import styles from "./AcertosDaCompetencia.module.css";
import type { Competencia } from "@/types/competencia";
import type { Residencia, CompetenciaComDespesas } from "@/types/residencia";

interface SemAcertosProps {
    residencia: Residencia;
    //null quando a residência ainda não tem nenhuma competência fechada; preenchida
    //quando o mês pedido na URL existe mas não foi fechado.
    competencia: Competencia | null;
    //Referência do seletor -- nunca null, mesmo quando `competencia` acima é (a
    //page cai na aberta nesse caso, ver page.tsx).
    competenciaSelecionada: Competencia;
    competencias: CompetenciaComDespesas[];
}

//Entrar pela navegação numa residência que ainda não fechou mês nenhum é um estado
//normal, não um erro: a residência existe e o usuário é membro dela. Cair no
//not-found.tsx da rota diria "Residência não encontrada", que é falso e manda o
//usuário procurar um problema que não existe.
export default function SemAcertos({ residencia, competencia, competenciaSelecionada, competencias }: SemAcertosProps) {
    const router = useRouter();

    //Mesmo seletor de Despesas/Relatórios -- escolher um mês fechado aqui leva
    //direto pra AcertosDaCompetencia; escolher um aberto só troca o texto acima.
    const trocarCompetencia = (mes: number, ano: number) => {
        router.push(`/dashboard/residences/${residencia.code}/settlements?mes=${mes}&ano=${ano}`);
    }

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/dashboard/residences/${residencia.code}`} className={styles.botaoVoltar}
                    aria-label="Voltar para a residência" title="Voltar para a residência">
                    <img src="/icons/voltarIcon.svg" alt="" width={22} height={22} />
                </Link>
                <h2>Acertos</h2>
                <span className={styles.espacoCanto} />
            </div>

            <SeletorCompetencia
                competencia={competenciaSelecionada}
                competencias={competencias}
                onSelecionar={trocarCompetencia} />

            <section className={styles.secao}>
                <p className={styles.vazio}>
                    {competencia
                        ? `${competenciaTexto(competencia.month, competencia.year)} ainda não foi fechado.`
                        : 'Nenhuma competência foi fechada nesta residência ainda.'}
                    
                </p>

                <Link href={`/dashboard/residences/${residencia.code}/expenses`} className={styles.botaoDespesas}>
                    Ver despesas
                </Link>
            </section>
        </div>
    )
}
