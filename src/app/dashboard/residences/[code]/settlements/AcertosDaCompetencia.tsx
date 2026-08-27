'use client'

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import confirmarRecebimentoAction from "./confirmarRecebimentoAction";
import ConfirmacaoModal from "../ConfirmacaoModal";
import DispensarAcertoModal from "./DispensarAcertoModal";
import AnexarComprovanteInput from "./AnexarComprovanteInput";
import Comprovante from "./Comprovante";
import SeletorCompetencia from "../expenses/SeletorCompetencia";
import Snackbar from "@/components/ui/Snackbar";
import { formatarValor } from "@/utils/dinheiro";
import { formatarMomento } from "@/utils/formatarMomento";
import { competenciaTexto } from "@/utils/categorias";
import styles from "./AcertosDaCompetencia.module.css";
import type { ActionState } from "@/types/actions";
import type { Residencia, CompetenciaComDespesas } from "@/types/residencia";
import type { ResumoAcertos, Acerto } from "@/types/acerto";

interface AcertosDaCompetenciaProps {
    residencia: Residencia;
    resumo: ResumoAcertos;
    competencias: CompetenciaComDespesas[];
}

interface LinhaAcertoProps {
    acerto: Acerto;
    residencia: Residencia;
    competencia: ResumoAcertos['competencia'];
    //D-05/RN-078 -> residência arquivada não aceita liquidação nenhuma; leitura
    //continua liberada, então a linha some com as ações, não com os dados.
    podeAgir: boolean;
    //D-07/RN-082 -> só o owner dispensa
    podeDispensar: boolean;
    //D-18 -> false quando storageEnabled está desligado do lado da API; a
    //confirmação de recebimento continua funcionando (não toca o S3).
    podeUpload: boolean;
    processando: boolean;
    onConfirmar: (acerto: Acerto) => void;
    onDispensar: (acerto: Acerto) => void;
    onEnviado: () => void;
}

//D-30 -> uma linha tem dois carimbos independentes (paidAt do devedor,
//confirmedAt do credor), sem ordem obrigatória entre eles (RN-076). Por isso
//nunca são reduzidos a um selo só -- cada um aparece separadamente, mesmo que
//só um dos dois esteja preenchido.
function LinhaAcerto({ acerto, residencia, competencia, podeAgir, podeDispensar, podeUpload, processando, onConfirmar, onDispensar, onEnviado }: LinhaAcertoProps) {
    const linhaLiquidadaOuDispensada = acerto.status === 'SETTLED' || acerto.status === 'WAIVED';
    const podeAnexar = podeAgir && acerto.isMinePaying && !linhaLiquidadaOuDispensada;

    return (
        <li className={styles.linha}>
            <div className={styles.linhaTopo}>
                <span className={styles.par}>{acerto.payer.name} → {acerto.receiver.name}</span>
                <span className={`${styles.valor} num`}>{formatarValor(acerto.amountInCents)}</span>
            </div>

            {acerto.waivedAt ? (
                <p className={styles.dispensado}>
                    Dispensado{acerto.waiveReason ? `: ${acerto.waiveReason}` : ''}
                </p>
            ) : (
                <>
                    <div className={styles.indicadores}>
                        <span className={`${styles.indicador} ${acerto.paidAt ? styles.indicadorFeito : ''}`}>
                            {acerto.paidAt
                                ? `Comprovante anexado · ${formatarMomento(acerto.paidAt)}`
                                : 'Comprovante ainda não anexado'}
                        </span>
                        <span className={`${styles.indicador} ${acerto.confirmedAt ? styles.indicadorFeito : ''}`}>
                            {acerto.confirmedAt
                                ? `Recebimento confirmado · ${formatarMomento(acerto.confirmedAt)}`
                                : 'Recebimento ainda não confirmado'}
                        </span>
                    </div>

                    {/* C.3 -> as miniaturas ficam visíveis antes do botão de confirmar,
                        pra quem vai confirmar decidir olhando pra elas. RN-080: qualquer
                        membro pode ver, não só quem está neste par -- por isso não é
                        condicionado a isMinePaying/isMineReceiving. */}
                    {acerto.receipts.length > 0 && (
                        <div className={styles.comprovantes}>
                            {acerto.receipts.map(comprovante => (
                                <Comprovante key={comprovante.id} code={residencia.code} month={competencia.month}
                                    year={competencia.year} receiptId={comprovante.id}
                                    contentType={comprovante.contentType} originalName={comprovante.originalName} />
                            ))}
                        </div>
                    )}

                    {podeAgir && !linhaLiquidadaOuDispensada && (acerto.isMineReceiving || podeAnexar || podeDispensar) && (
                        <div className={styles.acaoLinha}>
                            {/* C.3 -> a ação do credor. Nunca bloqueada por falta do
                                comprovante do devedor (RN-076) -- no máximo um aviso discreto. */}
                            {acerto.isMineReceiving && !acerto.paidAt && (
                                <p className={styles.avisoSemComprovante}>
                                    {acerto.payer.name} ainda não anexou o comprovante deste pagamento.
                                </p>
                            )}
                            <div className={styles.botoesLinha}>
                                {acerto.isMineReceiving && (
                                    <button type="button" className={styles.botaoConfirmar}
                                        onClick={() => onConfirmar(acerto)} disabled={processando}>
                                        Confirmar recebimento
                                    </button>
                                )}
                                {podeDispensar && (
                                    <button type="button" className={styles.botaoDispensar}
                                        onClick={() => onDispensar(acerto)} disabled={processando}>
                                        Dispensar
                                    </button>
                                )}
                            </div>

                            {/* D-06 -> o lado pagador não liquida sem comprovante; D-11 ->
                                N comprovantes por linha, então o botão continua aparecendo
                                mesmo depois do primeiro anexo. */}
                            {podeAnexar && (
                                podeUpload ? (
                                    <AnexarComprovanteInput code={residencia.code} month={competencia.month}
                                        year={competencia.year} settlementId={acerto.id} onEnviado={onEnviado} />
                                ) : (
                                    <p className={styles.avisoSemComprovante}>
                                        O envio de comprovantes está indisponível no momento. Tente mais tarde.
                                    </p>
                                )
                            )}
                        </div>
                    )}
                </>
            )}
        </li>
    );
}

//FEAT-036 -> lista os acertos (pares devedor→credor, D-01/D-29) de uma
//competência fechada. Alcançada pelo botão "Ver acertos" do painel ou da tela de
//despesas, que trazem ?mes&ano, e também pelo item "Acertos" da navegação do
//AppShell, que não traz -- nesse caso a page resolve a última competência
//fechada (ver page.tsx). Revisa a decisão C.2 do plano, que previa só os botões.
export default function AcertosDaCompetencia({ residencia, resumo, competencias }: AcertosDaCompetenciaProps) {
    const [confirmando, setConfirmando] = useState<Acerto | null>(null);
    const [dispensando, setDispensando] = useState<Acerto | null>(null);
    const [processando, setProcessando] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
    const router = useRouter();

    //Mesmo seletor de Despesas/Relatórios -- trocar de competência aqui é
    //literalmente navegar pra outro ?mes&ano, a page resolve o resto (inclusive
    //cair em SemAcertos quando o mês escolhido não estiver fechado).
    const trocarCompetencia = (mes: number, ano: number) => {
        router.push(`/dashboard/residences/${residencia.code}/settlements?mes=${mes}&ano=${ano}`);
    }

    const meus = resumo.acertos.filter(acerto => acerto.isMinePaying || acerto.isMineReceiving);
    //"Todos os acertos do mês" é uma visão de administração (RN-080 permite ver,
    //mas só o owner precisa acompanhar pares em que não está envolvido) -- um
    //membro comum só enxerga os próprios pares, em "Seus acertos". As linhas já
    //listadas ali não se repetem aqui.
    const outros = resumo.acertos.filter(acerto => !acerto.isMinePaying && !acerto.isMineReceiving);
    const podeAgir = !residencia.isArchived;
    const podeDispensar = residencia.isOwner && podeAgir;

    const mostrarSnackbar = (message: string, type: string) => {
        setSnackbar({ open: true, message, type });
        setTimeout(() => setSnackbar({ open: false, message: "", type: "" }), 4000);
    }

    const executarAcao = async (acao: () => Promise<ActionState>) => {
        setProcessando(true);
        const resposta = await acao();
        setProcessando(false);
        setConfirmando(null);

        mostrarSnackbar(resposta?.message || "Não foi possível concluir a ação", resposta?.success ? "success" : "error");

        if (resposta?.success) {
            router.refresh();
        }
    }

    const confirmarRecebimento = (acerto: Acerto) => setConfirmando(acerto);

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/dashboard/residences/${residencia.code}`} className={styles.botaoVoltar}
                    aria-label="Voltar para a residência" title="Voltar para a residência">
                    <img src="/icons/voltarIcon.svg" alt="" width={22} height={22} />
                </Link>
                <h2>Acertos</h2>
                <span className={styles.espacoCanto} />
            </div>

            <SeletorCompetencia
                competencia={resumo.competencia}
                competencias={competencias}
                onSelecionar={trocarCompetencia} />

            <p className={styles.metaFechamento}>
                 Mês fechado por {resumo.closedByName} {formatarMomento(resumo.closedAt)}
            </p>

            {meus.length > 0 && (
                <section className={styles.secao}>
                    <h3>Seus acertos</h3>
                    <ul className={styles.lista}>
                        {meus.map(acerto => (
                            <LinhaAcerto key={acerto.id} acerto={acerto} residencia={residencia} competencia={resumo.competencia}
                                podeAgir={podeAgir} podeDispensar={podeDispensar} podeUpload={resumo.canUpload}
                                processando={processando} onConfirmar={confirmarRecebimento} onDispensar={setDispensando}
                                onEnviado={() => router.refresh()} />
                        ))}
                    </ul>
                </section>
            )}

            {residencia.isOwner && (
                <section className={styles.secao}>
                    <h3>Todos os acertos do mês</h3>

                    {outros.length === 0 ? (
                        <p className={styles.vazio}>
                            {resumo.acertos.length === 0
                                ? 'Nenhum acerto nesta competência.'
                                : 'Nenhum outro acerto nesta competência.'}
                        </p>
                    ) : (
                        <ul className={styles.lista}>
                            {outros.map(acerto => (
                                <LinhaAcerto key={acerto.id} acerto={acerto} residencia={residencia} competencia={resumo.competencia}
                                    podeAgir={podeAgir} podeDispensar={podeDispensar} podeUpload={resumo.canUpload}
                                    processando={processando} onConfirmar={confirmarRecebimento} onDispensar={setDispensando}
                                    onEnviado={() => router.refresh()} />
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {confirmando && (
                <ConfirmacaoModal
                    titulo="Confirmar recebimento"
                    mensagem={`Confirmar que você recebeu ${formatarValor(confirmando.amountInCents)} de ${confirmando.payer.name}? Isso não pode ser desfeito.`}
                    textoConfirmar="Confirmar recebimento"
                    processando={processando}
                    onConfirmar={() => executarAcao(() => confirmarRecebimentoAction(
                        residencia.code, resumo.competencia.month, resumo.competencia.year, confirmando.id,
                    ))}
                    onCancelar={() => setConfirmando(null)} />
            )}

            {dispensando && (
                <DispensarAcertoModal
                    code={residencia.code}
                    month={resumo.competencia.month}
                    year={resumo.competencia.year}
                    acerto={dispensando}
                    onFechar={() => setDispensando(null)} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar({ open: false, message: "", type: "" })} />
        </div>
    )
}
