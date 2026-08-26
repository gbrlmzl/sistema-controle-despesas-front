'use client'

import Link from "next/link";

import type useNotificacoes from "@/hooks/useNotificacoes";
import { formatarMomento } from "@/utils/formatarMomento";
import { linkNotificacao } from "@/utils/linkNotificacao";
import { IconeSino } from "@/components/layout/Icones";
import styles from "./SinoNotificacoes.module.css";

//O sino aparece duas vezes no shell (rail do desktop e topo do mobile), com apenas um
//visível por vez. O estado vem de fora justamente por isso: se cada instância chamasse
//useNotificacoes(), o app faria duas rodadas de polling e os dois contadores poderiam
//divergir. Quem chama o hook uma única vez é o AppShell.
type EstadoNotificacoes = ReturnType<typeof useNotificacoes>;

//FEAT-017 / US-016 -> sino de notificações, ancorado no shell da área autenticada.
export default function SinoNotificacoes({ notificacoes, naoLidas, painelAberto, alternarPainel, fecharPainel }: EstadoNotificacoes) {
    return (
        <div className={styles.container}>
            <button type="button" className={styles.gatilho} onClick={alternarPainel}
                aria-expanded={painelAberto} aria-label="Notificações">
                <IconeSino />
                {/* CA-2 -> indicador com a quantidade de não lidas */}
                {naoLidas > 0 && (
                    <span className={styles.indicador}>{naoLidas > 9 ? "9+" : naoLidas}</span>
                )}
            </button>

            {painelAberto && (
                <>
                    <div className={styles.fundo} onClick={fecharPainel} aria-hidden="true" />

                    <div className={styles.painel} role="dialog" aria-label="Notificações">
                        {notificacoes.length === 0 ? (
                            <p className={styles.vazio}>Você não tem notificações</p>
                        ) : (
                            <ul className={styles.lista}>
                                {notificacoes.map(notificacao => (
                                    <li key={notificacao.id} className={notificacao.isRead ? styles.item : styles.itemNaoLido}>
                                        {/* CA-10 -> clicar leva ao contexto da notificação */}
                                        <Link href={linkNotificacao(notificacao.linkTo, notificacao.type)} onClick={fecharPainel}>
                                            <span className={styles.itemTitulo}>{notificacao.title}</span>
                                            <span className={styles.itemMensagem}>{notificacao.message}</span>
                                            <span className={styles.itemData}>{formatarMomento(notificacao.createdAt)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <Link href="/dashboard/alerts" className={styles.mostrarTudo} onClick={fecharPainel}>
                            Mostrar tudo
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
