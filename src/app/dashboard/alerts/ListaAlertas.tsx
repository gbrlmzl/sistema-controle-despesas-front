'use client'

import Link from "next/link";

import useAlertas from "@/hooks/useAlertas";
import Loading from "@/components/ui/Loading";
import { formatarMomento } from "@/utils/formatarMomento";
import { linkNotificacao } from "@/utils/linkNotificacao";
import styles from "./ListaAlertas.module.css";

//FEAT-017 / US-021 -> histórico completo de notificações do usuário.
export default function ListaAlertas() {
    const { notificacoes, pagina, totalPaginas, naoLidas, loading, erro, marcarTodasComoLidas, irParaPagina } = useAlertas();

    const cabecalho = (
        <div className={styles.cabecalho}>
            <Link href="/dashboard/residences" className={styles.botaoCanto} aria-label="Retornar ao menu" title="Retornar ao menu">
                <img src="/icons/voltarIcon.svg" alt="Retornar ao menu" width={22} height={22} />
            </Link>
            <h2>Notificações</h2>
            <span className={styles.espacoCanto} />
        </div>
    );

    if (loading) {
        return (
            <div className={styles.container}>
                {cabecalho}
                <Loading />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {cabecalho}

            {erro && (
                <div className={styles.errorMessage}>
                    <span>{erro}</span>
                </div>
            )}

            {naoLidas > 0 && (
                <button type="button" className={styles.botaoMarcarTodas} onClick={marcarTodasComoLidas}>
                    Marcar todas como lidas
                </button>
            )}

            {!erro && notificacoes.length === 0 && (
                <p className={styles.listaVazia}>Você não tem notificações</p>
            )}

            {notificacoes.length > 0 && (
                <ul className={styles.lista}>
                    {notificacoes.map(notificacao => (
                        <li key={notificacao.id} className={notificacao.isRead ? styles.item : styles.itemNaoLido}>
                            <Link href={linkNotificacao(notificacao.linkTo, notificacao.type)}>
                                <span className={styles.itemTitulo}>{notificacao.title}</span>
                                <span className={styles.itemMensagem}>{notificacao.message}</span>
                                <span className={styles.itemData}>{formatarMomento(notificacao.createdAt)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {/* RN-040 -> paginação a partir de 20 itens por página */}
            {totalPaginas > 1 && (
                <div className={styles.paginacao}>
                    <button type="button" onClick={() => irParaPagina(pagina - 1)} disabled={pagina === 1}>
                        Anterior
                    </button>
                    <span>{pagina} de {totalPaginas}</span>
                    <button type="button" onClick={() => irParaPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                        Próxima
                    </button>
                </div>
            )}

        </div>
    )
}
