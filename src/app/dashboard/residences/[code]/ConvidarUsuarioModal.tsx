'use client'

import { useActionState, useEffect, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";

import convidarUsuarioAction from "./convidarUsuarioAction";
import styles from './ConvidarUsuarioModal.module.css';
import type { Residencia } from "@/types/residencia";

interface ConvidarUsuarioModalProps {
    residencia: Pick<Residencia, "code" | "name">;
    onFechar: () => void;
}

export default function ConvidarUsuarioModal({ residencia, onFechar }: ConvidarUsuarioModalProps) {
    const [state, formAction, isPending] = useActionState(convidarUsuarioAction, null);
    const [username, setUsername] = useState('');
    const router = useRouter();

    const usernameValido = username.length >= 3;

    //Mantém o campo no mesmo formato aceito pelo servidor enquanto o usuário digita
    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    }

    //O modal continua aberto após um envio bem-sucedido, para que o owner
    //consiga convidar várias pessoas seguidas sem reabrir a tela.
    //A dependência é o objeto `state` inteiro: como ele permanece `success === true`
    //entre dois convites seguidos, depender de `state.success` faria o efeito rodar
    //só na primeira vez e o campo não seria limpo nas seguintes.
    useEffect(() => {
        if (!state?.success) {
            return;
        }

        setUsername('');
        router.refresh();
    }, [state, router]);

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloConvidar">
            <div className={styles.modal}>
                <h3 id="tituloConvidar">Convidar usuário</h3>
                <p className={styles.subtitulo}>Residência {residencia.name}</p>

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

                <Form action={formAction} className={styles.form}>
                    <input type="hidden" name="code" value={residencia.code} />
                    <input type="text" name="username" placeholder="Nome de usuário" value={username}
                        onChange={handleUsernameChange} autoComplete="off" />

                    <div className="botoesContainer">
                        <button type="button" className="botaoTexto" onClick={onFechar} disabled={isPending}>Fechar</button>
                        <button type="submit" className="botaoTexto" disabled={isPending || !usernameValido}>Convidar</button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
