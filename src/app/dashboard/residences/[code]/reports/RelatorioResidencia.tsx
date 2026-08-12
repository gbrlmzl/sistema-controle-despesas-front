'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";

import SeletorCompetencia from "../expenses/SeletorCompetencia";
import GraficosRelatorio from "./GraficosRelatorio";
import { formatarValor } from "@/utils/dinheiro";
import { rotuloCategoria, competenciaTexto } from "@/utils/categorias";
import { gerarCsv, baixarCsv } from "@/utils/csv";
import { compartilharResumoDaResidencia } from "@/utils/resumoImagem";
import Snackbar from "@/components/ui/Snackbar";
import styles from "./RelatorioResidencia.module.css";
import type { Competencia } from "@/types/competencia";
import type { Residencia, CompetenciaComDespesas } from "@/types/residencia";
import type { RelatorioComDesvios, Comparativo, Evolucao, Rateio, DespesaExportacao } from "@/types/relatorios";

interface RelatorioResidenciaProps {
    residencia: Residencia;
    competencia: Competencia;
    competencias: CompetenciaComDespesas[];
    abaAtiva: 'pessoal' | 'residencia';
    relatorio: RelatorioComDesvios;
    comparativo: Comparativo;
    evolucao: Evolucao;
    rateio: Rateio;
    totalDaCasaInCents: number;
    despesas: DespesaExportacao[];
}

export default function RelatorioResidencia({
    residencia, competencia, competencias, abaAtiva,
    relatorio, comparativo, evolucao, rateio, totalDaCasaInCents, despesas,
}: RelatorioResidenciaProps) {
    const router = useRouter();
    const [gerandoImagem, setGerandoImagem] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });

    const ehPessoal = abaAtiva === 'pessoal';
    const semDados = relatorio.categorias.length === 0;

    const irPara = (novaAba: string, mes: number, ano: number) => {
        router.push(`/dashboard/residences/${residencia.code}/reports?aba=${novaAba}&mes=${mes}&ano=${ano}`);
    }

    //CA-6 da US-025 -> trocar de aba preserva a competência
    const trocarAba = (novaAba: string) => irPara(novaAba, competencia.month, competencia.year);
    const trocarCompetencia = (mes: number, ano: number) => irPara(abaAtiva, mes, ano);

    //FEAT-033 -> a exportação respeita a competência e a aba em exibição
    const exportarCsv = () => {
        const linhas = despesas.map(despesa => [
            new Date(despesa.createdAt).toLocaleDateString('pt-BR'),
            despesa.autor,
            despesa.name,
            rotuloCategoria(despesa.category),
            (despesa.valueInCents / 100).toFixed(2).replace('.', ','),
        ]);

        const conteudo = gerarCsv(["Data", "Autor", "Despesa", "Categoria", "Valor"], linhas);
        const sufixo = ehPessoal ? 'meus-gastos' : 'residencia';
        baixarCsv(`${residencia.code}-${competencia.year}-${String(competencia.month).padStart(2, '0')}-${sufixo}.csv`, conteudo);
    }

    //FEAT-034 -> gera a imagem do resumo e entrega pelo compartilhamento nativo ou download
    const compartilharResumo = async () => {
        setGerandoImagem(true);

        try {
            const resultado = await compartilharResumoDaResidencia({
                residencia: residencia,
                competencia: competencia,
                totalInCents: rateio.totalInCents,
                participantes: rateio.participantes,
            });

            if (resultado.baixado) {
                setSnackbar({ open: true, message: "Imagem baixada!", type: "success" });
                setTimeout(() => setSnackbar(anterior => ({ ...anterior, open: false })), 3000);
            }
        } catch (erro) {
            setSnackbar({ open: true, message: "Não foi possível gerar a imagem", type: "error" });
            setTimeout(() => setSnackbar(anterior => ({ ...anterior, open: false })), 4000);
        } finally {
            setGerandoImagem(false);
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.cabecalho}>
                <div>
                    <h1>Relatórios</h1>
                    <p className={styles.subtitulo}>
                        {competenciaTexto(competencia.month, competencia.year)}
                        {despesas.length > 0 && ` · ${despesas.length} lançamento${despesas.length > 1 ? 's' : ''}`}
                    </p>
                </div>
            </header>

            <div className={styles.abas} role="tablist">
                <button type="button" role="tab" aria-selected={!ehPessoal}
                    className={!ehPessoal ? styles.abaAtiva : styles.aba}
                    onClick={() => trocarAba('residencia')}>
                    Residência
                </button>
                <button type="button" role="tab" aria-selected={ehPessoal}
                    className={ehPessoal ? styles.abaAtiva : styles.aba}
                    onClick={() => trocarAba('pessoal')}>
                    Meus gastos
                </button>
            </div>

            {/* Atalhos para os meses recentes + calendário para qualquer competência anterior */}
            <div className={styles.seletorLinha}>
                <SeletorCompetencia
                    competencia={competencia}
                    competencias={competencias}
                    onSelecionar={trocarCompetencia} />
            </div>

            <div className={styles.totalGeral}>
                <span className={styles.totalRotulo}>{ehPessoal ? "Meus gastos" : "Total da residência"}</span>
                <span className={styles.totalValor}>{formatarValor(relatorio.totalInCents)}</span>
                {/* CA-4 da US-025 -> quanto os meus gastos representam do total da casa */}
                {ehPessoal && totalDaCasaInCents > 0 && (
                    <span className={styles.totalDetalhe}>
                        {((relatorio.totalInCents / totalDaCasaInCents) * 100).toFixed(1).replace('.', ',')}% do total da casa
                    </span>
                )}
            </div>

            {semDados && (
                <p className={styles.listaVazia}>
                    {ehPessoal
                        ? "Você não lançou despesas nesta competência"
                        : "Nenhuma despesa cadastrada nesta competência"}
                </p>
            )}

            {!semDados && (
                <>
                    <div className={styles.secao}>
                        <h3>Por categoria</h3>
                        <ul className={styles.listaCategorias}>
                            {relatorio.categorias.map(categoria => (
                                <li key={categoria.category} className={styles.categoria}>
                                    <div className={styles.categoriaTopo}>
                                        <span className={styles.categoriaNome}>{rotuloCategoria(categoria.category)}</span>
                                        <span className={styles.categoriaValor}>{formatarValor(categoria.totalInCents)}</span>
                                    </div>

                                    <div className={styles.barraFundo}>
                                        <div className={styles.barraPreenchida} style={{ width: `${categoria.percentual}%` }} />
                                    </div>

                                    <div className={styles.categoriaRodape}>
                                        <span>{categoria.percentual.toFixed(1).replace('.', ',')}% do total</span>

                                        {/* FEAT-035 -> desvio em relação à média das competências anteriores */}
                                        {categoria.desvio !== null && (
                                            <span className={categoria.acimaDaMedia ? styles.desvioAlto : styles.desvioBaixo}>
                                                {categoria.acimaDaMedia ? '▲' : '▼'} {Math.abs(categoria.desvio * 100).toFixed(0)}% vs. média de {formatarValor(categoria.mediaInCents ?? 0)}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* FEAT-027 -> comparativo com a competência anterior */}
                    <div className={styles.secao}>
                        <h3>Comparado com o mês anterior</h3>

                        {!comparativo.temBaseDeComparacao ? (
                            <p className={styles.semComparacao}>Não há competência anterior com dados para comparar</p>
                        ) : (
                            <>
                                <p className={comparativo.variacaoInCents >= 0 ? styles.variacaoAlta : styles.variacaoBaixa}>
                                    {comparativo.variacaoInCents >= 0 ? '▲' : '▼'} {formatarValor(Math.abs(comparativo.variacaoInCents))}
                                    {comparativo.percentual !== null && ` (${Math.abs(comparativo.percentual).toFixed(0)}%)`}
                                    {comparativo.variacaoInCents >= 0 ? ' acima' : ' abaixo'} do mês anterior
                                </p>

                                <ul className={styles.listaComparativo}>
                                    {comparativo.categorias.map(item => (
                                        <li key={item.category}>
                                            <span>{rotuloCategoria(item.category)}</span>
                                            <span className={item.variacaoInCents >= 0 ? styles.variacaoAlta : styles.variacaoBaixa}>
                                                {item.isNova
                                                    ? 'nova'
                                                    : item.percentual === null
                                                        ? formatarValor(item.variacaoInCents)
                                                        : `${item.percentual >= 0 ? '+' : ''}${item.percentual.toFixed(0)}%`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    <GraficosRelatorio categorias={relatorio.categorias} evolucao={evolucao} />
                </>
            )}

            {/* FEAT-029 -> o rateio é sempre da casa, independente da aba */}
            <div className={styles.secao}>
                <h3>Rateio entre os membros</h3>

                {!rateio.temRateio ? (
                    <p className={styles.semComparacao}>Não há despesas para dividir nesta competência</p>
                ) : (
                    <>
                        <p className={styles.cota}>Cota individual: {formatarValor(rateio.cotaInCents)}</p>
                        <ul className={styles.listaRateio}>
                            {rateio.participantes.map(participante => (
                                <li key={participante.userId} className={styles.participante}>
                                    <div className={styles.participanteInfo}>
                                        <span className={styles.participanteNome}>{participante.name}</span>
                                        <span className={styles.participanteGasto}>
                                            gastou {formatarValor(participante.gastoInCents)}
                                        </span>
                                    </div>
                                    <span className={participante.recebe ? styles.recebe : participante.paga ? styles.paga : styles.quitado}>
                                        {participante.recebe && `recebe ${formatarValor(participante.saldoInCents)}`}
                                        {participante.paga && `paga ${formatarValor(Math.abs(participante.saldoInCents))}`}
                                        {!participante.recebe && !participante.paga && 'quitado'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            <div className={styles.acoes}>
                {/* FEAT-034 -> o resumo compartilhado é sempre o da casa, como o rateio */}
                <button type="button" className={styles.botaoSecundario} onClick={compartilharResumo}
                    disabled={!rateio.temRateio || gerandoImagem}>
                    {gerandoImagem ? "Gerando imagem..." : "Compartilhar resumo"}
                </button>

                <button type="button" className={styles.botaoSecundario} onClick={exportarCsv} disabled={despesas.length === 0}>
                    Exportar CSV
                </button>
            </div>

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar(anterior => ({ ...anterior, open: false }))} />
        </div>
    )
}
