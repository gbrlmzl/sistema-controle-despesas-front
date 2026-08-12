'use client'

import { useActionState, useEffect, useState } from "react";
import Form from "next/form"
import Link from "next/link";
import { useRouter } from "next/navigation";

import cadastrarDespesaAction from "../cadastrarDespesaAction";
import pararRecorrenciaAction from "./pararRecorrenciaAction";
import EditarDespesaModal from "../EditarDespesaModal";
import ConfirmacaoModal from "../../ConfirmacaoModal";
import Snackbar from "@/components/ui/Snackbar";
import { formatarValor } from "@/utils/dinheiro";
import { CATEGORIAS, rotuloCategoria, competenciaTexto } from "@/utils/categorias";
import styles from './DespesasRecorrentes.module.css';
import type { ExpenseCategory } from "@/types/expenseCategory";
import type { Competencia } from "@/types/competencia";
import type { Residencia, DespesaRecorrente } from "@/types/residencia";

interface Confirmacao {
    titulo: string;
    mensagem: string;
    textoConfirmar: string;
    onConfirmar: () => Promise<void>;
}

interface DespesasRecorrentesProps {
    residencia: Residencia;
    competencia: Competencia;
    despesasRecorrentes: DespesaRecorrente[];
}

//FEAT-025 -> tela dedicada para criar, editar e parar de repetir despesas recorrentes.
//Cada membro só gerencia as próprias (RN-019), sempre na competência aberta: não existe
//"molde" de despesa recorrente independente do mês, é a mesma Expense reaproveitada.
export default function DespesasRecorrentes({ residencia, competencia, despesasRecorrentes }: DespesasRecorrentesProps) {
    const [criarState, criarAction, criando] = useActionState(cadastrarDespesaAction, null);
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [editando, setEditando] = useState<DespesaRecorrente | null>(null);
    const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
    const [processando, setProcessando] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
    const router = useRouter();

    const dadosPreenchidos = name.trim().length >= 2 && value.trim().length > 0 && category !== '';

    useEffect(() => {
        if (!criarState?.success) {
            return;
        }

        setName('');
        setValue('');
        setCategory('');
        router.refresh();
        mostrarSnackbar('Despesa recorrente criada!', 'success');
    }, [criarState, router]);

    const mostrarSnackbar = (msg: string, type: string) => {
        setSnackbar({ open: true, message: msg, type: type });
        setTimeout(() => setSnackbar({ open: false, message: "", type: "" }), 4000);
    }

    const confirmarParada = (despesa: DespesaRecorrente) => setConfirmacao({
        titulo: "Parar de repetir",
        mensagem: `"${despesa.name}" deixará de ser lançada automaticamente nos próximos meses. O lançamento de ${competenciaTexto(competencia.month, competencia.year)} continua valendo e pode ser editado ou excluído em Consultar despesas.`,
        textoConfirmar: "Parar de repetir",
        onConfirmar: async () => {
            setProcessando(true);
            const resposta = await pararRecorrenciaAction(residencia.code, despesa.id);
            setProcessando(false);
            setConfirmacao(null);
            mostrarSnackbar(resposta?.message, resposta?.success ? "success" : "error");
            if (resposta?.success) {
                router.refresh();
            }
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/dashboard/residences/${residencia.code}/expenses`} className={styles.botaoCanto}
                    aria-label="Retornar" title="Retornar">
                    <img src="/icons/voltarIcon.svg" alt="Retornar" width={22} height={22} />
                </Link>
                <h2>Despesas recorrentes</h2>
                <span className={styles.espacoCanto} />
            </div>

            <p className={styles.competencia}>{competenciaTexto(competencia.month, competencia.year)}</p>
            <p className={styles.explicacao}>
                Lançadas de novo automaticamente todo mês, até você parar de repeti-las.
            </p>

            <Form action={criarAction} className={styles.formCriar}>
                <input type="hidden" name="code" value={residencia.code} />
                <input type="hidden" name="isRecurring" value="on" />

                <div className={styles.formFields}>
                    <input type="text" name="name" placeholder="Nome da despesa" value={name} maxLength={60}
                        onChange={(e) => setName(e.target.value)} autoComplete="off" />

                    <input type="text" name="value" placeholder="Valor (ex.: 180,50)" value={value}
                        onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoComplete="off" />

                    <select name="category" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                        <option value="">Selecione a categoria</option>
                        {CATEGORIAS.map(categoria => (
                            <option key={categoria.value} value={categoria.value}>{categoria.label}</option>
                        ))}
                    </select>
                </div>

                {criarState?.success === false && (
                    <div className={styles.errorMessage}>
                        <span>{criarState?.message}</span>
                    </div>
                )}

                <button type="submit" className={styles.botaoAdicionar} disabled={criando || !dadosPreenchidos}>
                    Adicionar despesa recorrente
                </button>
            </Form>

            <div className={styles.listaContainer}>
                <h3>Cadastradas</h3>

                {despesasRecorrentes.length === 0 && (
                    <p className={styles.listaVazia}>Nenhuma despesa recorrente cadastrada.</p>
                )}

                <ul className={styles.lista}>
                    {despesasRecorrentes.map(despesa => (
                        <li key={despesa.id} className={styles.despesa}>
                            <div className={styles.despesaInfo}>
                                <span className={styles.despesaNome}>{despesa.name}</span>
                                <span className={styles.despesaCategoria}>{rotuloCategoria(despesa.category)}</span>
                            </div>

                            <div className={styles.despesaLado}>
                                <span className={styles.despesaValor}>{formatarValor(despesa.valueInCents)}</span>

                                <div className={styles.despesaAcoes}>
                                    <button type="button" className={styles.botaoEditar}
                                        onClick={() => setEditando(despesa)} disabled={processando}>
                                        Editar
                                    </button>
                                    <button type="button" className={styles.botaoExcluir}
                                        onClick={() => confirmarParada(despesa)} disabled={processando}>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {editando && (
                <EditarDespesaModal residencia={residencia} despesa={editando} onFechar={() => setEditando(null)} />
            )}

            {confirmacao && (
                <ConfirmacaoModal
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    textoConfirmar={confirmacao.textoConfirmar}
                    processando={processando}
                    onConfirmar={confirmacao.onConfirmar}
                    onCancelar={() => setConfirmacao(null)} />
            )}

            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar({ open: false, message: "", type: "" })} />
        </div>
    )
}
