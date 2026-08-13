'use client';
import Form from "next/form";
import Link from 'next/link';

import { useLogin } from "@/hooks/useLogin";
import styles from '../authForm.module.css';

const GOOGLE_LOGIN_URL = "/api/auth/google";

export default function LoginForm() {
    const {
        state,
        formAction,
        isPending,
        username,
        setUsername,
        password,
        setPassword,
        showPassword,
        togglePasswordVisibility,
        dadosPreenchidos,
    } = useLogin();

    return (
        <div>
            <h1 className={styles.titulo}>Entrar</h1>
            <p className={styles.subtitulo}>Bem-vindo de volta.</p>

            {state?.success === false && (
                <div className={styles.erro}>
                    <span>{state?.message}</span>
                </div>
            )}

            <Form action={formAction}>
                <div className={styles.campos}>
                    <input type="text" name="username" placeholder="Nome de usuário" value={username}
                        onChange={(e) => setUsername(e.target.value)} autoComplete="username" />

                    <div className={styles.campoSenha}>
                        <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Senha"
                            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                        <span className={styles.alternarSenha} onClick={togglePasswordVisibility}>
                            <img src={showPassword ? "/icons/olhoIcon.svg" : "/icons/olhoCortadoIcon.svg"}
                                alt="Mostrar/Ocultar senha" />
                        </span>
                    </div>
                </div>

                <button type="submit" className={styles.botaoEnviar} disabled={isPending || !dadosPreenchidos}>
                    {isPending ? "Entrando..." : "Entrar"}
                </button>
            </Form>

            <div className={styles.separador}>ou</div>

            <a href={GOOGLE_LOGIN_URL} className={styles.botaoGoogle}>
                <img src="/icons/googleIcon.svg" alt="" />
                Continuar com Google
            </a>

            <p className={styles.rodape}>
                Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
            </p>
        </div>
    )
}
