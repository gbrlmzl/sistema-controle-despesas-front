'use client'

import Link from "next/link";

import useAcoesResidencia from "../useAcoesResidencia";
import ConfirmacaoModal from "../ConfirmacaoModal";
import RenomearResidenciaModal from "../RenomearResidenciaModal";
import Snackbar from "@/components/ui/Snackbar";
import styles from "./ConfiguracoesResidencia.module.css";
import type { Residencia } from "@/types/residencia";

interface ConfiguracoesResidenciaProps {
    residencia: Residencia;
}

//Tela de configurações da residência, acessível pela engrenagem do painel.
//O owner encontra aqui a administração completa; o membro comum, apenas ver os
//membros e sair da residência. Convidar usuário mora em /members (junto da lista
//que o convite alimenta), não aqui.
export default function ConfiguracoesResidencia({ residencia }: ConfiguracoesResidenciaProps) {
    const {
        confirmacao,
        fecharConfirmacao,
        processando,
        renomeando,
        abrirRenomear,
        fecharRenomear,
        confirmarSaida,
        confirmarArquivamento,
        confirmarRegeneracao,
        snackbar,
        fecharSnackbar,
    } = useAcoesResidencia(residencia);

    //RN-032 -> enquanto arquivada, a única ação de escrita do owner é desarquivar
    const somenteLeitura = residencia.isArchived;

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/dashboard/residences/${residencia.code}`} className={styles.botaoCanto}
                    aria-label="Retornar à residência" title="Retornar à residência">
                    <img src="/icons/voltarIcon.svg" alt="Retornar à residência" width={22} height={22} />
                </Link>
                <h2>Configurações</h2>
                <span className={styles.espacoCanto} />
            </div>

            <div className={styles.tituloContainer}>
                <p className={styles.nomeResidencia}>{residencia.name}</p>
                {somenteLeitura && (
                    <span className={styles.seloArquivada}>Arquivada · somente leitura</span>
                )}
            </div>

            {somenteLeitura && residencia.isOwner && (
                <p className={styles.avisoArquivada}>
                    Enquanto a residência estiver arquivada, as demais configurações ficam indisponíveis.
                    Desarquive-a para voltar a administrá-la.
                </p>
            )}

            <div className={styles.opcoesContainer}>
                <Link href={`/dashboard/residences/${residencia.code}/members`} className={styles.botaoOpcao}>
                    {residencia.isOwner ? "Gerenciar membros" : "Ver membros"}
                </Link>

                {residencia.isOwner && (
                    <>
                        <button type="button" className={styles.botaoOpcao} onClick={abrirRenomear} disabled={somenteLeitura}>
                            Renomear residência
                        </button>
                        <button type="button" className={styles.botaoOpcao} onClick={confirmarRegeneracao} disabled={somenteLeitura}>
                            Gerar novo código
                        </button>
                        <button type="button" className={styles.botaoOpcao} onClick={confirmarArquivamento}>
                            {residencia.isArchived ? "Desarquivar residência" : "Arquivar residência"}
                        </button>
                    </>
                )}

                {/* RN-021 -> o owner não pode sair; para isso precisa antes transferir a propriedade.
                    CA-11 da US-020 -> sair continua permitido mesmo com a residência arquivada. */}
                {!residencia.isOwner && (
                    <button type="button" className={styles.botaoPerigo} onClick={confirmarSaida}>
                        Sair da residência
                    </button>
                )}
            </div>

            {confirmacao && (
                <ConfirmacaoModal
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    textoConfirmar={confirmacao.textoConfirmar}
                    processando={processando}
                    onConfirmar={confirmacao.onConfirmar}
                    onCancelar={fecharConfirmacao} />
            )}

            {renomeando && residencia.isOwner && (
                <RenomearResidenciaModal residencia={residencia} onFechar={fecharRenomear} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={fecharSnackbar} />
        </div>
    )
}
