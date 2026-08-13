'use client'

import { formatarMomento } from "@/utils/formatarMomento";
import styles from "./PendenciasResidencia.module.css";
import type { SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

interface PendenciasResidenciaProps {
    solicitacoes: SolicitacaoPendente[];
    convites: ConviteEnviado[];
    processando: boolean;
    onResponderSolicitacao: (solicitacao: SolicitacaoPendente, aceitar: boolean) => void;
    onCancelarConvite: (convite: ConviteEnviado) => void;
}

//Pendências que pertencem à residência e só o owner enxerga:
//solicitações recebidas (US-009) e convites enviados (US-022).
export default function PendenciasResidencia({ solicitacoes, convites, processando, onResponderSolicitacao, onCancelarConvite }: PendenciasResidenciaProps) {

    if (solicitacoes.length === 0 && convites.length === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            {solicitacoes.length > 0 && (
                <div className={styles.secao}>
                    <h3>Solicitações de entrada</h3>
                    <ul className={styles.lista}>
                        {solicitacoes.map(solicitacao => (
                            <li key={solicitacao.id} className={styles.pendencia}>
                                <div className={styles.pendenciaInfo}>
                                    <span className={styles.pendenciaTitulo}>{solicitacao.requesterName}</span>
                                    <span className={styles.pendenciaDetalhe}>
                                        {solicitacao.requesterUsername ? `@${solicitacao.requesterUsername} · ` : ''}
                                        {formatarMomento(solicitacao.createdAt)}
                                    </span>
                                </div>
                                <div className={styles.pendenciaAcoes}>
                                    <button type="button" className={styles.botaoAceitar} disabled={processando}
                                        onClick={() => onResponderSolicitacao(solicitacao, true)}>
                                        Aceitar
                                    </button>
                                    <button type="button" className={styles.botaoNeutro} disabled={processando}
                                        onClick={() => onResponderSolicitacao(solicitacao, false)}>
                                        Recusar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {convites.length > 0 && (
                <div className={styles.secao}>
                    <h3>Convites enviados</h3>
                    <ul className={styles.lista}>
                        {convites.map(convite => (
                            <li key={convite.id} className={styles.pendencia}>
                                <div className={styles.pendenciaInfo}>
                                    <span className={styles.pendenciaTitulo}>{convite.invitedUserName}</span>
                                    <span className={styles.pendenciaDetalhe}>
                                        {convite.invitedUserUsername ? `@${convite.invitedUserUsername} · ` : ''}
                                        {formatarMomento(convite.createdAt)}
                                    </span>
                                </div>
                                <div className={styles.pendenciaAcoes}>
                                    <button type="button" className={styles.botaoNeutro} disabled={processando}
                                        onClick={() => onCancelarConvite(convite)}>
                                        Cancelar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
