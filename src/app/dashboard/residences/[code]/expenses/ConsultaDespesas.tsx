'use client'

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import excluirDespesaAction from "./excluirDespesaAction";
import fecharMesAction from "./fecharMesAction";
import reabrirMesAction from "./reabrirMesAction";
import EditarDespesaModal from "./EditarDespesaModal";
import SeletorCompetencia from "./SeletorCompetencia";
import ConfirmacaoModal from "../ConfirmacaoModal";
import CadastrarDespesaModal from "@/components/despesas/CadastrarDespesaModal";
import Snackbar from "@/components/ui/Snackbar";
import { formatarValor } from "@/utils/dinheiro";
import { rotuloCategoria, competenciaTexto } from "@/utils/categorias";
import styles from "./ConsultaDespesas.module.css";
import type { ActionState } from "@/types/actions";
import type { Competencia } from "@/types/competencia";
import type { Residencia, ResumoDespesas, DespesaItem, CompetenciaComDespesas } from "@/types/residencia";

interface Confirmacao {
    titulo: string;
    mensagem: string;
    textoConfirmar: string;
    onConfirmar: () => Promise<void>;
}

interface ConsultaDespesasProps {
    residencia: Residencia;
    usuarioId: number;
    competencias: CompetenciaComDespesas[];
    competencia: Competencia;
    resumo: ResumoDespesas;
    isCompetenciaAberta: boolean;
    podeReabrir: boolean;
}

//FEAT-022 -> consulta por competência, agrupada por membro, com total por membro
//e total geral. Concentra também a edição/exclusão (FEAT-023) e o fechamento do mês.
export default function ConsultaDespesas({ residencia, usuarioId, competencias, competencia, resumo, isCompetenciaAberta, podeReabrir }: ConsultaDespesasProps) {
    const [editando, setEditando] = useState<DespesaItem | null>(null);
    const [cadastrando, setCadastrando] = useState(false);
    //Os grupos nascem recolhidos: a tela abre mostrando os totais por membro, e o
    //usuário expande apenas quem quer detalhar. Guarda quem está expandido.
    const [gruposExpandidos, setGruposExpandidos] = useState<number[]>([]);
    const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
    const [processando, setProcessando] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
    const router = useRouter();

    //Uma competência fechada, ou uma residência arquivada, fica somente leitura
    const podeAlterar = !resumo.isClosed && !residencia.isArchived;

    const mostrarSnackbar = (msg: string, type: string) => {
        setSnackbar({ open: true, message: msg, type: type });
        setTimeout(() => setSnackbar({ open: false, message: "", type: "" }), 4000);
    }

    const executarAcao = async (acao: () => Promise<ActionState>) => {
        setProcessando(true);
        const resposta = await acao();
        setProcessando(false);
        setConfirmacao(null);

        mostrarSnackbar(
            resposta?.message || "Não foi possível concluir a ação",
            resposta?.success ? "success" : "error"
        );

        if (resposta?.success) {
            router.refresh();
        }
    }

    const trocarCompetencia = (mes: number, ano: number) => {
        router.push(`/dashboard/residences/${residencia.code}/expenses?mes=${mes}&ano=${ano}`);
    }

    const alternarGrupo = (userId: number) => {
        setGruposExpandidos(anterior => anterior.includes(userId)
            ? anterior.filter(id => id !== userId)
            : [...anterior, userId]
        );
    }

    const confirmarExclusao = (despesa: DespesaItem) => setConfirmacao({
        titulo: "Excluir despesa",
        mensagem: `Excluir "${despesa.name}" no valor de ${formatarValor(despesa.valueInCents)}?`,
        textoConfirmar: "Excluir",
        onConfirmar: () => executarAcao(() => excluirDespesaAction(residencia.code, despesa.id)),
    });

    const confirmarFechamento = () => setConfirmacao({
        titulo: "Fechar o mês",
        mensagem: `As despesas de ${competenciaTexto(competencia.month, competencia.year)} ficarão somente leitura e os novos lançamentos passarão para o mês seguinte. Todos os membros serão avisados.`,
        textoConfirmar: "Fechar mês",
        onConfirmar: () => executarAcao(() => fecharMesAction(residencia.code, competencia.month, competencia.year)),
    });

    const confirmarReabertura = () => setConfirmacao({
        titulo: "Reabrir o mês",
        mensagem: `${competenciaTexto(competencia.month, competencia.year)} voltará a aceitar alterações nas despesas.`,
        textoConfirmar: "Reabrir",
        onConfirmar: () => executarAcao(() => reabrirMesAction(residencia.code, competencia.month, competencia.year)),
    });

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/dashboard/residences/${residencia.code}`} className={styles.botaoCanto}
                    aria-label="Retornar à residência" title="Retornar à residência">
                    <img src="/icons/voltarIcon.svg" alt="Retornar à residência" width={22} height={22} />
                </Link>
                <h2>Despesas</h2>
                <span className={styles.espacoCanto} />
            </div>

            {/* Q-2 -> a consulta é sempre filtrada por competência, com o mês aberto pré-selecionado */}
            <SeletorCompetencia
                competencia={competencia}
                competencias={competencias}
                onSelecionar={trocarCompetencia} />

            {resumo.isClosed && (
                <span className={styles.seloFechado}>
                    Mês fechado{resumo.closedByName ? ` por ${resumo.closedByName}` : ''} · somente leitura
                </span>
            )}

            {/* Q-4 -> total geral em destaque */}
            <div className={styles.totalGeral}>
                <span className={styles.totalRotulo}>Total da residência</span>
                <span className={styles.totalValor}>{formatarValor(resumo.totalInCents)}</span>
            </div>

            {/* Q-6 -> estado vazio */}
            {resumo.quantidade === 0 && (
                <p className={styles.listaVazia}>Nenhuma despesa cadastrada nesta competência</p>
            )}

            {/* Q-3 -> agrupamento por membro, com o grupo recolhível */}
            {resumo.porMembro.map(grupo => {
                const recolhido = !gruposExpandidos.includes(grupo.userId);

                return (
                <div key={grupo.userId} className={styles.grupoMembro}>
                    <button type="button" className={styles.grupoCabecalho}
                        onClick={() => alternarGrupo(grupo.userId)}
                        aria-expanded={!recolhido}
                        title={recolhido ? "Mostrar despesas" : "Recolher despesas"}>
                        <span className={styles.grupoNome}>
                            <img src="/icons/expandirIcon.svg" alt=""
                                className={`${styles.seta} ${recolhido ? '' : styles.setaExpandida}`}
                                width={18} height={18} />
                            {grupo.name}
                            {grupo.userId === usuarioId && (<span className={styles.marcadorVoce}>você</span>)}
                        </span>
                        <span className={styles.grupoTotal}>{formatarValor(grupo.totalInCents)}</span>
                    </button>

                    <div className={`${styles.areaDespesas} ${recolhido ? styles.areaRecolhida : ''}`} inert={recolhido}>
                      <div className={styles.areaInterna}>
                        <ul className={styles.listaDespesas}>
                        {grupo.despesas.map(despesa => (
                            <li key={despesa.id} className={styles.despesa}>
                                <div className={styles.despesaInfo}>
                                    <span className={styles.despesaNome}>
                                        {despesa.name}
                                        {despesa.isRecurring && (<span className={styles.marcadorRecorrente}>recorrente</span>)}
                                    </span>
                                    <span className={styles.despesaCategoria}>{rotuloCategoria(despesa.category)}</span>
                                </div>

                                <div className={styles.despesaLado}>
                                    <span className={styles.despesaValor}>{formatarValor(despesa.valueInCents)}</span>

                                    {/* Q-5 -> só o autor altera a própria despesa */}
                                    {podeAlterar && despesa.createdById === usuarioId && (
                                        <div className={styles.despesaAcoes}>
                                            <button type="button" className={styles.botaoEditar}
                                                onClick={() => setEditando(despesa)} disabled={processando}>
                                                Editar
                                            </button>
                                            <button type="button" className={styles.botaoExcluir}
                                                onClick={() => confirmarExclusao(despesa)} disabled={processando}>
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                        </ul>
                      </div>
                    </div>
                </div>
                );
            })}

            <div className={styles.acoes}>
                {isCompetenciaAberta && !residencia.isArchived && (
                    <button type="button" className={styles.botaoPrincipal} onClick={() => setCadastrando(true)}>
                        Cadastrar despesa
                    </button>
                )}

                {residencia.isOwner && isCompetenciaAberta && !residencia.isArchived && (
                    <button type="button" className={styles.botaoSecundario} onClick={confirmarFechamento} disabled={processando}>
                        Fechar mês
                    </button>
                )}

                {residencia.isOwner && podeReabrir && !residencia.isArchived && (
                    <button type="button" className={styles.botaoSecundario} onClick={confirmarReabertura} disabled={processando}>
                        Reabrir mês
                    </button>
                )}
            </div>

            {editando && (
                <EditarDespesaModal residencia={residencia} despesa={editando} onFechar={() => setEditando(null)} />
            )}

            <CadastrarDespesaModal codigo={residencia.code} aberto={cadastrando} onFechar={() => setCadastrando(false)} />

            {confirmacao && (
                <ConfirmacaoModal
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    textoConfirmar={confirmacao.textoConfirmar}
                    processando={processando}
                    onConfirmar={confirmacao.onConfirmar}
                    onCancelar={() => setConfirmacao(null)} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar({ open: false, message: "", type: "" })} />
        </div>
    )
}
