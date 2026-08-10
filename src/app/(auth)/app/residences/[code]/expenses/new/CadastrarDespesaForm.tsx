'use client'

import { useActionState, useEffect, useRef, useState } from "react";
import Form from "next/form"
import Link from "next/link";
import { useRouter } from "next/navigation";

import cadastrarDespesaAction from "../cadastrarDespesaAction";
import Snackbar from "@/components/ui/Snackbar";
import { CATEGORIAS, competenciaTexto } from "@/utils/categorias";
import styles from './CadastrarDespesaForm.module.css';
import type { ExpenseCategory } from "@/types/expenseCategory";
import type { Competencia } from "@/types/competencia";
import type { Residencia } from "@/types/residencia";

interface CadastrarDespesaFormProps {
    residencia: Pick<Residencia, "code">;
    competencia: Competencia;
}

export default function CadastrarDespesaForm({ residencia, competencia }: CadastrarDespesaFormProps) {
    const [state, formAction, isPending] = useActionState(cadastrarDespesaAction, null);
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
    const nameInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const dadosPreenchidos = name.trim().length >= 2 && value.trim().length > 0 && category !== '';

    //CA-2 -> o lançamento é incremental: após salvar, o formulário se limpa
    //para que o membro registre a próxima despesa sem sair da tela.
    //A dependência é o objeto `state` inteiro, e não `state.success`: dois cadastros
    //seguidos bem-sucedidos teriam o mesmo `success === true`, e o efeito não voltaria
    //a rodar. Cada resposta da action é um objeto novo, então a identidade sempre muda.
    useEffect(() => {
        if (!state?.success) {
            return;
        }

        setName('');
        setValue('');
        setCategory('');
        router.refresh();

        //O foco volta para o nome assim que a despesa é salva, para o próximo
        //lançamento começar direto pelo teclado, sem precisar clicar de novo.
        nameInputRef.current?.focus();

        setSnackbar({ open: true, message: state.message, type: "success" });
        const temporizador = setTimeout(() => {
            setSnackbar(anterior => ({ ...anterior, open: false }));
        }, 3000);

        return () => clearTimeout(temporizador);
    }, [state, router]);

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href={`/app/residences/${residencia.code}/expenses`} className={styles.botaoCanto}
                    aria-label="Retornar às despesas" title="Retornar às despesas">
                    <img src="/icons/voltarIcon.svg" alt="Retornar às despesas" width={22} height={22} />
                </Link>
                <h2>Cadastrar despesa</h2>
                <span className={styles.espacoCanto} />
            </div>
            {/* RN-020 -> o lançamento cai sempre na competência aberta, então ela é informada e não escolhida */}
            <p className={styles.competencia}>{competenciaTexto(competencia.month, competencia.year)}</p>


            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span>{state?.message}</span>
                </div>
            )}

            <Form action={formAction}>
                <input type="hidden" name="code" value={residencia.code} />



                <div className={styles.formFields}>
                    <input ref={nameInputRef} type="text" name="name" placeholder="Nome da despesa" value={name} maxLength={60}
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

                <div className={styles.submitButtonContainer}>
                    <button type="submit" disabled={isPending || !dadosPreenchidos}>
                        <span>
                            <img src="/icons/adicionarIcon.svg" alt="Cadastrar despesa" />
                        </span>
                    </button>
                </div>
            </Form>

            <Link href={`/app/residences/${residencia.code}/expenses/recurring`} className={styles.botaoRecorrentes}>
                Despesas recorrentes
            </Link>



            <Snackbar
                open={snackbar.open}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar(anterior => ({ ...anterior, open: false }))} />
        </div>
    )
}
