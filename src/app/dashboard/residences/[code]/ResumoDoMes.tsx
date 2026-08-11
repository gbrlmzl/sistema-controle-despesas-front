'use client'

import { formatarValor } from "@/utils/dinheiro";
import { rotuloCategoria, competenciaTexto, competenciaCurta } from "@/utils/categorias";
import { formatarMomento } from "@/utils/formatarMomento";
import styles from "./ResumoDoMes.module.css";
import type { Competencia } from "@/types/competencia";
import type { ResumoCompetencia, AtividadeItem } from "@/types/residencia";

interface ResumoDoMesProps {
    competencia: Competencia;
    resumo: ResumoCompetencia;
    atividade: AtividadeItem[];
}

//P-1 e P-2 do painel -> como está o mês em aberto e o que aconteceu por último.
//As duas leem apenas o que o EP-04 já grava, sem campo novo no banco.
export default function ResumoDoMes({ competencia, resumo, atividade }: ResumoDoMesProps) {

    const maiorTotal = resumo.porMembro.reduce((maior, membro) => Math.max(maior, membro.totalInCents), 0);

    return (
        <div className={styles.container}>
            <div className={styles.secao}>
                <div className={styles.tituloSecao}>
                    <h3>{competenciaTexto(competencia.month, competencia.year)}</h3>
                    {resumo.isClosed && (<span className={styles.seloFechado}>fechado</span>)}
                </div>

                <div className={styles.totalContainer}>
                    <span className={styles.totalValor}>{formatarValor(resumo.totalInCents)}</span>
                    <span className={styles.totalDetalhe}>
                        {resumo.quantidade === 0
                            ? "nenhum lançamento ainda"
                            : `${resumo.quantidade} lançamento${resumo.quantidade > 1 ? 's' : ''}`}
                    </span>
                </div>

                {resumo.porMembro.length > 0 && (
                    <ul className={styles.listaMembros}>
                        {resumo.porMembro.map(membro => (
                            <li key={membro.userId} className={styles.membro}>
                                <div className={styles.membroTopo}>
                                    <span className={styles.membroNome}>{membro.name}</span>
                                    <span className={styles.membroValor}>{formatarValor(membro.totalInCents)}</span>
                                </div>
                                <div className={styles.barraFundo}>
                                    <div className={styles.barraPreenchida}
                                        style={{ width: maiorTotal > 0 ? `${(membro.totalInCents / maiorTotal) * 100}%` : '0%' }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {atividade.length > 0 && (
                <div className={styles.secao}>
                    <h3>Atividade recente</h3>
                    <ul className={styles.listaAtividade}>
                        {atividade.map(item => (
                            <li key={item.id} className={styles.atividade}>
                                <span className={styles.atividadeTexto}>
                                    <strong>{item.autor}</strong> lançou {item.name}
                                    <span className={styles.atividadeCategoria}>
                                        {' · '}{rotuloCategoria(item.category)}
                                        {' · '}{competenciaCurta(item.month, item.year)}
                                    </span>
                                </span>
                                <span className={styles.atividadeLado}>
                                    <span className={styles.atividadeValor}>{formatarValor(item.valueInCents)}</span>
                                    <span className={styles.atividadeMomento}>{formatarMomento(item.createdAt)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
