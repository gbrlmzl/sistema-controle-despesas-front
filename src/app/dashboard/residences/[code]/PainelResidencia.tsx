'use client'

import Link from "next/link";

import useAcoesResidencia from "./useAcoesResidencia";
import PendenciasResidencia from "./PendenciasResidencia";
import ResumoDoMes from "./ResumoDoMes";
import ConfirmacaoModal from "./ConfirmacaoModal";
import Snackbar from "@/components/ui/Snackbar";
import { IconeConfiguracoes, IconeVoltar } from "@/components/layout/Icones";
import styles from "./PainelResidencia.module.css";
import type { Competencia } from "@/types/competencia";
import type { Residencia, SolicitacaoPendente, ConviteEnviado, ResumoCompetencia, AtividadeItem } from "@/types/residencia";
import type { ParticipanteRateio, Evolucao, Comparativo } from "@/types/relatorios";

interface PainelResidenciaProps {
    residencia: Residencia;
    solicitacoes: SolicitacaoPendente[];
    convites: ConviteEnviado[];
    competencia: Competencia;
    resumo: ResumoCompetencia;
    atividade: AtividadeItem[];
    saldoPessoal: ParticipanteRateio | null;
    evolucao: Evolucao;
    comparativo: Comparativo;
}

//FEAT-008 -> Painel da residência.
//A administração (convidar, renomear, código, arquivar, membros) fica na tela de
//configurações, acessível pela engrenagem.
export default function PainelResidencia({
    residencia, solicitacoes, convites, competencia, resumo, atividade,
    saldoPessoal, evolucao, comparativo,
}: PainelResidenciaProps) {
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
            <header className={styles.cabecalho}>
                <div className={styles.identidade}>
                    <div className={styles.tituloLinha}>
                        <Link href="/dashboard/residences" className={styles.botaoVoltar}
                            aria-label="Voltar para as residências" title="Voltar para as residências">
                            <IconeVoltar size={18} />
                        </Link>
                        <h1>{residencia.name}</h1>
                    </div>
                    <div className={styles.meta}>
                        <span className={`${styles.codigo} num`}>{residencia.code}</span>
                        <span className={styles.criador}>por {residencia.ownerName}</span>
                        {residencia.isArchived && (
                            <span className={styles.seloArquivada}>Arquivada · somente leitura</span>
                        )}
                    </div>
                </div>

                {/* Todo membro tem configurações: o owner encontra a administração
                    completa e o membro comum encontra ver membros e sair da residência */}
                <Link href={`/dashboard/residences/${residencia.code}/settings`} className={styles.botaoEngrenagem}
                    aria-label="Configurações da residência" title="Configurações da residência">
                    <IconeConfiguracoes size={18} />
                </Link>
            </header>

            {/* P-1 e P-2 -> como está o mês em aberto e o que aconteceu por último */}
            <ResumoDoMes
                competencia={competencia}
                resumo={resumo}
                atividade={atividade}
                saldoPessoal={saldoPessoal}
                evolucao={evolucao}
                comparativo={comparativo} />

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
