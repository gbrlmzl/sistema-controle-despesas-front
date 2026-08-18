'use client';
import Form from "next/form";
import Link from 'next/link';

import { useEsqueciSenha } from "@/hooks/useEsqueciSenha";
import styles from '../authForm.module.css';

export default function EsqueciSenhaForm() {
    const {
        state,
        formAction,
        isPending,
        email,
        setEmail,
        dadosPreenchidos,
        segundosRestantes,
    } = useEsqueciSenha();

    //Estado de sucesso (F-04): troca o formulário pela confirmação no mesmo
    //componente — uma rota própria ("/enviado") seria alcançável por URL direta e
    //mostraria "email enviado" pra quem nunca pediu nada.
    if (state?.success) {
        return (
            <div>
                <h1 className={styles.titulo}>Esqueceu a senha?</h1>

                <div className={styles.sucesso}>
                    <span>{state.message}</span>
                </div>

                <Form action={formAction}>
                    <input type="hidden" name="email" value={email} />
                    <button type="submit" className={styles.botaoSecundario} disabled={isPending || segundosRestantes > 0}>
                        {segundosRestantes > 0 ? `Reenviar (${segundosRestantes}s)` : "Reenviar"}
                    </button>
                </Form>

                <p className={styles.rodape}>
                    <Link href="/login">Voltar para o login</Link>
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className={styles.titulo}>Esqueceu a senha?</h1>
            <p className={styles.subtitulo}>Informe seu email e enviaremos um link para redefinir sua senha.</p>

            {state?.success === false && (
                <div className={styles.erro}>
                    <span>{state.message}</span>
                </div>
            )}

            {/* noValidate: a mensagem de "email inválido" é a do esqueciSenhaSchema (Zod),
                não a do navegador — senão as duas podem divergir. */}
            <Form action={formAction} noValidate>
                <div className={styles.campos}>
                    <input type="email" name="email" placeholder="Email" value={email}
                        onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>

                <button type="submit" className={styles.botaoEnviar} disabled={isPending || !dadosPreenchidos}>
                    {isPending ? "Enviando..." : "Enviar link"}
                </button>
            </Form>

            <p className={styles.rodape}>
                <Link href="/login">Voltar para o login</Link>
            </p>
        </div>
    );
}
