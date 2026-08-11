'use client'

import Link from "next/link";

import useAcoesResidencia from "../useAcoesResidencia";
import ListaMembros from "../ListaMembros";
import ConfirmacaoModal from "../ConfirmacaoModal";
import Snackbar from "@/components/ui/Snackbar";
import styles from "./GerenciarMembros.module.css";
import type { Residencia } from "@/types/residencia";

interface GerenciarMembrosProps {
    residencia: Residencia;
}

//FEAT-010 e FEAT-011 -> lista de membros com as ações de remover e transferir a
//propriedade. Saiu do painel para uma tela própria, alcançada pelas configurações.
export default function GerenciarMembros({ residencia }: GerenciarMembrosProps) {
    const {
        confirmacao,
        fecharConfirmacao,
        processando,
        confirmarRemocao,
        confirmarTransferencia,
        snackbar,
        fecharSnackbar,
    } = useAcoesResidencia(residencia);

    //RN-032 -> residência arquivada é somente leitura
    const podeGerenciar = residencia.isOwner && !residencia.isArchived;

    //A tela é sempre alcançada pelas configurações, então é para lá que a seta volta
    const destinoVoltar = `/app/residences/${residencia.code}/settings`;

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={destinoVoltar} className={styles.botaoCanto} aria-label="Retornar" title="Retornar">
                    <img src="/icons/voltarIcon.svg" alt="Retornar" width={22} height={22} />
                </Link>
                <h2>Membros</h2>
                <span className={styles.espacoCanto} />
            </div>

            <p className={styles.nomeResidencia}>{residencia.name}</p>

            {residencia.isArchived && (
                <span className={styles.seloArquivada}>Arquivada · somente leitura</span>
            )}

            <ListaMembros
                membros={residencia.members}
                podeGerenciar={podeGerenciar}
                onRemover={confirmarRemocao}
                onTransferir={confirmarTransferencia} />

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
