'use client'

import entrarResidenciaAction from "./entrarResidenciaAction";
import { useActionState, useState } from "react";
import Form from "next/form"
import Link from "next/link";

import styles from './EntrarResidenciaForm.module.css';


export default function EntrarResidenciaForm() {
    const [state, formAction, isPending] = useActionState(entrarResidenciaAction, null);
    const [code, setCode] = useState('');

    const codigoPreenchido = code.length === 6;

    //RN-012 -> normaliza enquanto o usuário digita, para que colar um código
    //com espaços ou em minúsculas simplesmente funcione.
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    }

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href="/dashboard/residences" className={styles.botaoCanto} aria-label="Retornar ao menu" title="Retornar ao menu">
                    <img src="/icons/voltarIcon.svg" alt="Retornar ao menu" width={22} height={22} />
                </Link>
                <h2>Entrar em residência</h2>
                <span className={styles.espacoCanto} />
            </div>

            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span>{state?.message}</span>
                </div>
            )}

            {state?.success && (
                <div className={styles.successMessage}>
                    <span>{state?.message}</span>
                </div>
            )}

            <Form action={formAction}>
                <div className={styles.formFields}>
                    <input type="text" name="code" placeholder="CÓDIGO" value={code} onChange={handleCodeChange}
                        className={styles.campoCodigo} autoComplete="off" />
                    <span className={styles.fieldHint}>Peça o código de 6 caracteres a quem criou a residência</span>
                </div>
                <div className={styles.submitButtonContainer}>
                    <button type="submit" disabled={isPending || !codigoPreenchido}>
                        <span>
                            <img src="/icons/avancarIcon.svg" alt="Enviar solicitação" />
                        </span>
                    </button>
                </div>
            </Form>
        </div>
    )
}
