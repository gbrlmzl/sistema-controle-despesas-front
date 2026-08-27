'use client'

import Link from "next/link";

import useAcoesResidencia from "../useAcoesResidencia";
import ListaMembros from "../ListaMembros";
import ConfirmacaoModal from "../ConfirmacaoModal";
import ConvidarUsuarioModal from "../ConvidarUsuarioModal";
import Snackbar from "@/components/ui/Snackbar";
import { IconeSolicitacoes } from "@/components/layout/Icones";
import styles from "./GerenciarMembros.module.css";
import type { Residencia } from "@/types/residencia";

interface GerenciarMembrosProps {
    residencia: Residencia;
    quantidadeSolicitacoes: number;
    abrirConviteInicial?: boolean;
}

//FEAT-010 e FEAT-011 -> lista de membros com as ações de remover e transferir a
//propriedade. Saiu do painel para uma tela própria, alcançada pelas configurações.
//FEAT-007/US-007 -> convidar usuário mora aqui também, ao lado de quem já mora na casa.
export default function GerenciarMembros({ residencia, quantidadeSolicitacoes, abrirConviteInicial = false }: GerenciarMembrosProps) {
    const {
        confirmacao,
        fecharConfirmacao,
        processando,
        confirmarRemocao,
        confirmarTransferencia,
        convidando,
        abrirConvidar,
        fecharConvidar,
        snackbar,
        fecharSnackbar,
    } = useAcoesResidencia(residencia, abrirConviteInicial);

    //RN-032 -> residência arquivada é somente leitura
    const podeGerenciar = residencia.isOwner && !residencia.isArchived;

    //A tela é sempre alcançada pelas configurações, então é para lá que a seta volta
    const destinoVoltar = `/dashboard/residences/${residencia.code}/settings`;

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={destinoVoltar} className={styles.botaoCanto} aria-label="Retornar" title="Retornar">
                    <img src="/icons/voltarIcon.svg" alt="Retornar" width={22} height={22} />
                </Link>
                <h2>Membros</h2>
                {/* US-009 e US-022 -> só o owner administra convites e solicitações;
                    o contador funciona como o do sino de notificações (CA-2). */}
                {residencia.isOwner ? (
                    <Link href={`/dashboard/residences/${residencia.code}/members/requests`}
                        className={styles.botaoSolicitacoes}
                        aria-label={quantidadeSolicitacoes > 0
                            ? `Convites e solicitações, ${quantidadeSolicitacoes} solicitação(ões) pendente(s)`
                            : "Convites e solicitações"}
                        title="Convites e solicitações">
                        <IconeSolicitacoes size={18} />
                        {quantidadeSolicitacoes > 0 && (
                            <span className={styles.indicador}>{quantidadeSolicitacoes > 9 ? "9+" : quantidadeSolicitacoes}</span>
                        )}
                    </Link>
                ) : (
                    <span className={styles.espacoCanto} />
                )}
            </div>

            <p className={styles.nomeResidencia}>{residencia.name}</p>

            {residencia.isArchived && (
                <span className={styles.seloArquivada}>Arquivada · somente leitura</span>
            )}

            <ListaMembros
                membros={residencia.members}
                podeGerenciar={podeGerenciar}
                onRemover={confirmarRemocao}
                onTransferir={confirmarTransferencia}
                onConvidar={podeGerenciar ? abrirConvidar : undefined} />

            {confirmacao && (
                <ConfirmacaoModal
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    textoConfirmar={confirmacao.textoConfirmar}
                    processando={processando}
                    onConfirmar={confirmacao.onConfirmar}
                    onCancelar={fecharConfirmacao} />
            )}

            {convidando && podeGerenciar && (
                <ConvidarUsuarioModal residencia={residencia} onFechar={fecharConvidar} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={fecharSnackbar} />
        </div>
    )
}
