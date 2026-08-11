'use client'

import { useActionState, useEffect, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";

import renomearResidenciaAction from "./renomearResidenciaAction";
import styles from './RenomearResidenciaModal.module.css';
import type { Residencia } from "@/types/residencia";

interface RenomearResidenciaModalProps {
    residencia: Pick<Residencia, "code" | "name">;
    onFechar: () => void;
}

export default function RenomearResidenciaModal({ residencia, onFechar }: RenomearResidenciaModalProps) {
    const [state, formAction, isPending] = useActionState(renomearResidenciaAction, null);
    //CA-2 -> o campo já vem preenchido com o nome atual
    const [name, setName] = useState(residencia.name);
    const router = useRouter();

    //Mesmo mínimo exigido pelo residenceNameSchema
    const nomePreenchido = name.trim().length >= 3;

    useEffect(() => {
        if (state?.success) {
            router.refresh(); //recarrega o nome vindo do servidor
            onFechar();
        }
    }, [state?.success, router]);

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloRenomear">
            <div className={styles.modal}>
                <h3 id="tituloRenomear">Renomear residência</h3>

                {state?.success === false && (
                    <div className={styles.errorMessage}>
                        <span>{state?.message}</span>
                    </div>
                )}

                <Form action={formAction} className={styles.form}>
                    <input type="hidden" name="code" value={residencia.code} />
                    <input type="text" name="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
                    <span className={styles.fieldHint}>De 3 a 40 caracteres, apenas letras, números e espaços</span>

                    <div className="botoesContainer">
                        <button type="button" className="botaoTexto" onClick={onFechar} disabled={isPending}>Cancelar</button>
                        <button type="submit" className="botaoTexto" disabled={isPending || !nomePreenchido}>Salvar</button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
