'use client'

import Link from "next/link";

import useAcoesResidencia from "./useAcoesResidencia";
import PendenciasResidencia from "./PendenciasResidencia";
import ResumoDoMes from "./ResumoDoMes";
import ConfirmacaoModal from "./ConfirmacaoModal";
import Snackbar from "@/components/ui/Snackbar";
import styles from "./PainelResidencia.module.css";
import type { Competencia } from "@/types/competencia";
import type { Residencia, SolicitacaoPendente, ConviteEnviado, ResumoCompetencia, AtividadeItem } from "@/types/residencia";

interface PainelResidenciaProps {
    residencia: Residencia;
    solicitacoes: SolicitacaoPendente[];
    convites: ConviteEnviado[];
    competencia: Competencia;
    resumo: ResumoCompetencia;
    atividade: AtividadeItem[];
}

//FEAT-008 -> Painel da residência.
//A administração (convidar, renomear, código, arquivar, membros) fica na tela de
//configurações, acessível pela engrenagem.
export default function PainelResidencia({ residencia, solicitacoes, convites, competencia, resumo, atividade }: PainelResidenciaProps) {
    const {
        confirmacao,
        fecharConfirmacao,
        processando,
        responderSolicitacao,
        cancelarConvite,
        snackbar,
        fecharSnackbar,
    } = useAcoesResidencia(residencia);

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href="/app/residences" className={styles.botaoCanto}
                    aria-label="Retornar às residências" title="Retornar às residências">
                    <img src="/icons/voltarIcon.svg" alt="Retornar às residências" width={22} height={22} />
                </Link>

                <h2>{residencia.name}</h2>

                {/* Todo membro tem configurações: o owner encontra a administração
                    completa e o membro comum encontra ver membros e sair da residência */}
                <Link href={`/app/residences/${residencia.code}/settings`} className={styles.botaoCanto}
                    aria-label="Configurações da residência" title="Configurações da residência">
                    <img src="/icons/engrenagemIcon.svg" alt="Configurações da residência" width={22} height={22} />
                </Link>
            </div>

            <div className={styles.tituloContainer}>
                <p className={styles.codigoResidencia}>{residencia.code}</p>
                <div className={styles.criadorContainer}>
                    <img src="/icons/adminIcon.svg" alt="Criador da residência" width={14} height={14} />
                    <span>{residencia.ownerName}</span>
                </div>
                {residencia.isArchived && (
                    <span className={styles.seloArquivada}>Arquivada · somente leitura</span>
                )}
            </div>

            <div className={styles.botoesContainer}>
                <Link href={`/app/residences/${residencia.code}/expenses`} className={styles.botaoDespesas}>
                    Consultar despesas
                </Link>

                {/* Q-9 da US-020 -> residência arquivada não aceita novos lançamentos */}
                {residencia.isArchived ? (
                    <button type="button" className={styles.botaoDespesas} disabled title="Residência arquivada">
                        Cadastrar despesas
                    </button>
                ) : (
                    <Link href={`/app/residences/${residencia.code}/expenses/new`} className={styles.botaoDespesas}>
                        Cadastrar despesas
                    </Link>
                )}

                <Link href={`/app/residences/${residencia.code}/reports`} className={styles.botaoDespesas}>
                    Relatórios
                </Link>
            </div>

            {/* P-1 e P-2 -> como está o mês em aberto e o que aconteceu por último */}
            <ResumoDoMes competencia={competencia} resumo={resumo} atividade={atividade} />

            {/* US-009 e US-022 -> pendências que só o owner enxerga */}
            <PendenciasResidencia
                solicitacoes={solicitacoes}
                convites={convites}
                processando={processando}
                onResponderSolicitacao={responderSolicitacao}
                onCancelarConvite={cancelarConvite} />

            {confirmacao && (
                <ConfirmacaoModal
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    textoConfirmar={confirmacao.textoConfirmar}
                    processando={processando}
                    onConfirmar={confirmacao.onConfirmar}
                    onCancelar={fecharConfirmacao} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={fecharSnackbar} />
        </div>
    )
}
