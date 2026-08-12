'use client'

import { useActionState, useEffect, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";

import editarDespesaAction from "./editarDespesaAction";
import { CATEGORIAS } from "@/utils/categorias";
import styles from './EditarDespesaModal.module.css';
import type { Residencia, DespesaItem } from "@/types/residencia";

interface EditarDespesaModalProps {
    residencia: Pick<Residencia, "code">;
    despesa: Pick<DespesaItem, "id" | "name" | "valueInCents" | "category">;
    onFechar: () => void;
}

export default function EditarDespesaModal({ residencia, despesa, onFechar }: EditarDespesaModalProps) {
    const [state, formAction, isPending] = useActionState(editarDespesaAction, null);
    const [name, setName] = useState(despesa.name);
    //O campo é editado em reais, mas o valor trafega e é guardado em centavos
    const [value, setValue] = useState((despesa.valueInCents / 100).toFixed(2).replace('.', ','));
    const [category, setCategory] = useState(despesa.category);
    const router = useRouter();

    const dadosPreenchidos = name.trim().length >= 2 && value.trim().length > 0 && Boolean(category);

    useEffect(() => {
        if (state?.success) {
            router.refresh();
            onFechar();
        }
    }, [state?.success, router]);

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloEditarDespesa">
            <div className={styles.modal}>
                <h3 id="tituloEditarDespesa">Editar despesa</h3>

                {state?.success === false && (
                    <div className={styles.errorMessage}>
                        <span>{state?.message}</span>
                    </div>
                )}

                <Form action={formAction} className={styles.form}>
                    <input type="hidden" name="code" value={residencia.code} />
                    <input type="hidden" name="expenseId" value={despesa.id} />

                    <input type="text" name="name" value={name} maxLength={60}
                        onChange={(e) => setName(e.target.value)} autoComplete="off" />

                    <input type="text" name="value" value={value} inputMode="decimal"
                        onChange={(e) => setValue(e.target.value)} autoComplete="off" />

                    <select name="category" value={category} onChange={(e) => setCategory(e.target.value as typeof despesa.category)}>
                        {CATEGORIAS.map(categoria => (
                            <option key={categoria.value} value={categoria.value}>{categoria.label}</option>
                        ))}
                    </select>

                    {/*<label className={styles.recorrente}>
                        <input type="checkbox" name="isRecurring" defaultChecked={despesa.isRecurring} />
                        <span>Repetir nos próximos meses</span>
                    </label>
                       */}
                    <div className={styles.botoesContainer}>
                        <button type="button" className={styles.botaoSecundario} onClick={onFechar} disabled={isPending}>Cancelar</button>
                        <button type="submit" className={styles.botaoPrimario} disabled={isPending || !dadosPreenchidos}>Salvar</button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
