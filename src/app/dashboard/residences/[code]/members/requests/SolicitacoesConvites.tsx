'use client'

import Link from "next/link";

import useAcoesResidencia from "../../useAcoesResidencia";
import Snackbar from "@/components/ui/Snackbar";
import { formatarMomento } from "@/utils/formatarMomento";
import styles from "./SolicitacoesConvites.module.css";
import type { Residencia, SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

interface SolicitacoesConvitesProps {
    residencia: Residencia;
    solicitacoes: SolicitacaoPendente[];
    convites: ConviteEnviado[];
}

//US-009 e US-022 -> tela dedicada às pendências de acesso da residência: solicitações
//de entrada recebidas e convites enviados. Saiu do painel principal (onde ficava pouco
//visível) para trás do ícone com contador no topo de /members.
export default function SolicitacoesConvites({ residencia, solicitacoes, convites }: SolicitacoesConvitesProps) {
    const { processando, responderSolicitacao, cancelarConvite, snackbar, fecharSnackbar } = useAcoesResidencia(residencia);

    const destinoVoltar = `/dashboard/residences/${residencia.code}/members`;

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={destinoVoltar} className={styles.botaoCanto} aria-label="Retornar" title="Retornar">
                    <img src="/icons/voltarIcon.svg" alt="Retornar" width={22} height={22} />
                </Link>
                <h2>Convites e solicitações</h2>
                <span className={styles.espacoCanto} />
            </div>

            <p className={styles.nomeResidencia}>{residencia.name}</p>

            <section className={styles.secao}>
                <h3>Solicitações de entrada{solicitacoes.length > 0 && ` (${solicitacoes.length})`}</h3>
                {solicitacoes.length === 0 ? (
                    <p className={styles.vazio}>Nenhuma solicitação pendente.</p>
                ) : (
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
                                        onClick={() => responderSolicitacao(solicitacao, true)}>
                                        Aceitar
                                    </button>
                                    <button type="button" className={styles.botaoNeutro} disabled={processando}
                                        onClick={() => responderSolicitacao(solicitacao, false)}>
                                        Recusar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={styles.secao}>
                <h3>Convites enviados{convites.length > 0 && ` (${convites.length})`}</h3>
                {convites.length === 0 ? (
                    <p className={styles.vazio}>Nenhum convite enviado pendente.</p>
                ) : (
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
                                        onClick={() => cancelarConvite(convite)}>
                                        Cancelar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={fecharSnackbar} />
        </div>
    )
}
