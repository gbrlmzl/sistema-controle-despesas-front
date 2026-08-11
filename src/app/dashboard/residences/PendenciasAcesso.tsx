'use client'

import { useState } from "react";

import responderConviteAction from "./responderConviteAction";
import cancelarSolicitacaoAction from "./cancelarSolicitacaoAction";
import { formatarMomento } from "@/utils/formatarMomento";
import styles from "./PendenciasAcesso.module.css";
import type { ActionState } from "@/types/actions";
import type { ConviteRecebido, SolicitacaoEnviada } from "@/hooks/useResidencias";

interface PendenciasAcessoProps {
    convites: ConviteRecebido[];
    solicitacoes: SolicitacaoEnviada[];
    onAtualizar: () => Promise<void>;
    onMensagem: (resposta: ActionState | undefined) => void;
}

//Reúne as pendências de acesso do próprio usuário:
//convites recebidos (US-008) e solicitações que ele enviou (US-022).
export default function PendenciasAcesso({ convites, solicitacoes, onAtualizar, onMensagem }: PendenciasAcessoProps) {
    const [processando, setProcessando] = useState(false);

    const executarAcao = async (acao: () => Promise<ActionState>) => {
        setProcessando(true);
        const resposta = await acao();
        setProcessando(false);

        onMensagem(resposta);

        if (resposta?.success) {
            await onAtualizar();
        }
    }

    if (convites.length === 0 && solicitacoes.length === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            {convites.length > 0 && (
                <div className={styles.secao}>
                    <h3>Convites recebidos</h3>
                    <ul className={styles.lista}>
                        {convites.map(convite => (
                            <li key={convite.id} className={styles.pendencia}>
                                <div className={styles.pendenciaInfo}>
                                    <span className={styles.pendenciaTitulo}>{convite.residenceName}</span>
                                    <span className={styles.pendenciaDetalhe}>
                                        Convite de {convite.invitedByName} · {formatarMomento(convite.createdAt)}
                                    </span>
                                </div>
                                <div className={styles.pendenciaAcoes}>
                                    <button type="button" className={styles.botaoAceitar} disabled={processando}
                                        onClick={() => executarAcao(() => responderConviteAction(convite.id, true))}>
                                        Aceitar
                                    </button>
                                    <button type="button" className={styles.botaoRecusar} disabled={processando}
                                        onClick={() => executarAcao(() => responderConviteAction(convite.id, false))}>
                                        Recusar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {solicitacoes.length > 0 && (
                <div className={styles.secao}>
                    <h3>Solicitações enviadas</h3>
                    <ul className={styles.lista}>
                        {solicitacoes.map(solicitacao => (
                            <li key={solicitacao.id} className={styles.pendencia}>
                                <div className={styles.pendenciaInfo}>
                                    <span className={styles.pendenciaTitulo}>{solicitacao.residenceName}</span>
                                    <span className={styles.pendenciaDetalhe}>
                                        Aguardando resposta · {formatarMomento(solicitacao.createdAt)}
                                    </span>
                                </div>
                                <div className={styles.pendenciaAcoes}>
                                    <button type="button" className={styles.botaoRecusar} disabled={processando}
                                        onClick={() => executarAcao(() => cancelarSolicitacaoAction(solicitacao.id))}>
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
