'use client'

import Link from "next/link";

import { formatarValor } from "@/utils/dinheiro";
import { competenciaTexto, nomeDoMes, corCategoria } from "@/utils/categorias";
import { formatarMomento } from "@/utils/formatarMomento";
import { descricaoSelo, resumoMeusAcertos } from "@/utils/acerto";
import styles from "./ResumoDoMes.module.css";
import type { Competencia } from "@/types/competencia";
import type { ResumoCompetencia, AtividadeItem } from "@/types/residencia";
import type { ParticipanteRateio, Evolucao, Comparativo } from "@/types/relatorios";

interface ResumoDoMesProps {
    codigo: string;
    competencia: Competencia;
    resumo: ResumoCompetencia;
    atividade: AtividadeItem[];
    saldoPessoal: ParticipanteRateio | null;
    evolucao: Evolucao;
    comparativo: Comparativo;
}

//C.1 -> tom do selo vira a classe CSS correspondente. Um objeto em vez de um
//switch porque é só uma tradução 1:1, sem lógica.
const CLASSE_POR_TOM = {
    neutro: 'seloNeutro',
    atencaoPagamento: 'seloAtencaoPagamento',
    atencaoConfirmacao: 'seloAtencaoConfirmacao',
    positivo: 'seloPositivo',
} as const;

//Área útil do sparkline em unidades do viewBox. A curva nunca encosta nas bordas:
//sem essa folga o ponto do último mês fica cortado pela metade.
const GRAFICO = { largura: 300, altura: 56, folga: 5 };

//Converte a evolução em pontos de uma polyline. A escala é relativa ao maior valor
//da série — o gráfico responde à variação entre meses, não ao valor absoluto.
function pontosDoGrafico(evolucao: Evolucao): string {
    if (evolucao.length === 0) {
        return "";
    }

    const { largura, altura, folga } = GRAFICO;
    const maior = Math.max(...evolucao.map(item => item.totalInCents));
    const passo = evolucao.length > 1 ? largura / (evolucao.length - 1) : 0;
    const util = altura - folga * 2;

    return evolucao
        .map((item, indice) => {
            const x = evolucao.length > 1 ? indice * passo : largura / 2;
            //maior === 0 acontece quando nenhuma competência teve lançamento:
            //a linha fica rente à base em vez de dividir por zero.
            const proporcao = maior > 0 ? item.totalInCents / maior : 0;
            const y = folga + util * (1 - proporcao);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}

export default function ResumoDoMes({ codigo, competencia, resumo, atividade, saldoPessoal, evolucao, comparativo }: ResumoDoMesProps) {

    const maiorTotal = resumo.porMembro.reduce((maior, membro) => Math.max(maior, membro.totalInCents), 0);

    const recebe = (saldoPessoal?.saldoInCents ?? 0) > 0;
    const paga = (saldoPessoal?.saldoInCents ?? 0) < 0;

    //C.1 -> selo de 4 estados, alimentado pelo bloco settlement que já vem
    //junto com o resumo -- nenhuma requisição extra.
    const selo = descricaoSelo(resumo.isClosed, resumo.settlement);
    const chamadaAcertos = resumo.settlement ? resumoMeusAcertos(resumo.settlement.mine) : null;
    const linkAcertos = `/dashboard/residences/${codigo}/settlements?mes=${competencia.month}&ano=${competencia.year}`;

    const pontos = pontosDoGrafico(evolucao);
    const ultimo = evolucao.length > 0 ? pontos.split(" ").at(-1)?.split(",") : undefined;
    const subiu = comparativo.variacaoInCents >= 0;

    return (
        <div className={styles.container}>
            <div className={styles.linhaCards}>
                {/* O saldo pessoal é a razão nº1 de abrir o app: fica no topo, sozinho. */}
                <section className={styles.cardSaldo}>
                    <p className={styles.rotulo}>Seu saldo na casa</p>

                    {saldoPessoal ? (
                        <>
                            <p className={`${styles.saldoValor} ${recebe ? styles.positivo : paga ? styles.negativo : ''} num`}>
                                {recebe && '+ '}{paga && '− '}
                                {formatarValor(Math.abs(saldoPessoal.saldoInCents))}
                            </p>
                            <p className={styles.saldoDetalhe}>
                                Você pagou <strong className="num">{formatarValor(saldoPessoal.gastoInCents)}</strong>
                                {' '}e sua cota é <strong className="num">{formatarValor(saldoPessoal.cotaInCents)}</strong>.
                            </p>

                            {/* C.1 -> chamada direta pro que falta acertar, só quando sobra
                                alguma linha ainda não tocada (ver resumoMeusAcertos) */}
                            {chamadaAcertos && (
                                <Link href={linkAcertos} className={styles.chamadaAcertos}>
                                    {chamadaAcertos.texto} · <span className={styles.chamadaAcertosLink}>Ver acertos</span>
                                </Link>
                            )}
                        </>
                    ) : (
                        <>
                            <p className={`${styles.saldoValor} num`}>{formatarValor(0)}</p>
                            <p className={styles.saldoDetalhe}>Ainda não há despesas para dividir nesta competência.</p>
                        </>
                    )}
                </section>

                {/* Total da casa com o histórico das competências ao lado do número */}
                <section className={styles.cardTotal}>
                    <div className={styles.cardTotalTopo}>
                        <p className={styles.rotulo}>Total da residência</p>
                        {selo && (
                            <span className={`${styles.selo} ${styles[CLASSE_POR_TOM[selo.tom]]}`}>{selo.texto}</span>
                        )}
                    </div>

                    <p className={`${styles.totalValor} num`}>{formatarValor(resumo.totalInCents)}</p>

                    <p className={styles.totalDetalhe}>
                        {resumo.quantidade === 0
                            ? "nenhum lançamento ainda"
                            : `${resumo.quantidade} lançamento${resumo.quantidade > 1 ? 's' : ''}`}
                        {comparativo.temBaseDeComparacao && (
                            <span className={subiu ? styles.variacaoAlta : styles.variacaoBaixa}>
                                {subiu ? ' ▲ ' : ' ▼ '}
                                <span className="num">{formatarValor(Math.abs(comparativo.variacaoInCents))}</span>
                                {comparativo.percentual !== null && ` (${Math.abs(comparativo.percentual).toFixed(0)}%)`}
                                {' '}vs. mês anterior
                            </span>
                        )}
                    </p>

                    {evolucao.length > 1 && (
                        <div className={styles.grafico}>
                            <svg viewBox={`0 0 ${GRAFICO.largura} ${GRAFICO.altura}`} preserveAspectRatio="none"
                                className={styles.sparkline} role="img"
                                aria-label={`Evolução do total nas últimas ${evolucao.length} competências`}>
                                <polyline points={pontos} fill="none" stroke="var(--accent)" strokeWidth="2"
                                    strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                                {ultimo && (
                                    <circle cx={ultimo[0]} cy={ultimo[1]} r="3.5" fill="var(--accent)"
                                        vectorEffect="non-scaling-stroke" />
                                )}
                            </svg>

                            <div className={styles.graficoRotulos}>
                                {evolucao.map(item => (
                                    <span key={`${item.year}-${item.month}`}>
                                        {nomeDoMes(item.month).slice(0, 3).toLowerCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <section className={styles.secao}>
                <h3>{competenciaTexto(competencia.month, competencia.year)} · quem lançou quanto</h3>

                {resumo.porMembro.length === 0 ? (
                    <p className={styles.vazio}>Nenhuma despesa cadastrada nesta competência.</p>
                ) : (
                    <ul className={styles.listaMembros}>
                        {resumo.porMembro.map(membro => (
                            <li key={membro.userId} className={styles.membro}>
                                <div className={styles.membroTopo}>
                                    <span className={styles.membroNome}>{membro.name}</span>
                                    <span className={`${styles.membroValor} num`}>{formatarValor(membro.totalInCents)}</span>
                                </div>
                                <div className={styles.barraFundo}>
                                    <div className={styles.barraPreenchida}
                                        style={{ width: maiorTotal > 0 ? `${(membro.totalInCents / maiorTotal) * 100}%` : '0%' }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {atividade.length > 0 && (
                <section className={styles.secao}>
                    <h3>Atividade</h3>
                    <ul className={styles.listaAtividade}>
                        {atividade.map(item => (
                            <li key={item.id} className={styles.atividade}>
                                <span className={styles.atividadeDot} style={{ background: corCategoria(item.category) }} />
                                <span className={styles.atividadeGrow}>
                                    <span className={styles.atividadeTitulo}>{item.name}</span>
                                    <span className={styles.atividadeMeta} suppressHydrationWarning>{item.autor} · {formatarMomento(item.createdAt)}</span>
                                </span>
                                <span className={`${styles.atividadeValor} num`}>{formatarValor(item.valueInCents)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
