
'use client';
import Form from "next/form";
import { useLogin } from "@/hooks/useLogin";
import Link from 'next/link';

import styles from './LoginForm.module.css';

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
        <div className={styles.container}>
            <h1>Fazer login</h1>
            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span className="aa">{state?.message}</span>
                </div>

            )}

            <Form action={formAction}>
                <div className={styles.formFields}>
                    <input type="text" name="username" placeholder="Nome de usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <div className={styles.passwordField}>
                        <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <span className={styles.passwordToggle} onClick={togglePasswordVisibility}>
                            {showPassword ? (
                                <img src="/icons/olhoIcon.svg" alt="Mostrar/Ocultar senha" />
                            ) : (
                                <img src="/icons/olhoCortadoIcon.svg" alt="Mostrar/Ocultar senha" />)
                            }

                        </span>
                    </div>
                </div>
                <div className={styles.socialMediaLoginContainer}>
                    <a href={GOOGLE_LOGIN_URL} className={styles.socialMediaLogin}>
                        <img src="/icons/googleIcon.svg" alt="Login com Google" />
                    </a>
                </div>

                <div className={styles.submitButtonContainer}>
                    <button type="submit" disabled={isPending || !dadosPreenchidos}>
                        <span>
                            <img src="/icons/avancarIcon.svg" alt="Login" />
                        </span>
                    </button>
                </div>
            </Form>
            <Link href="/cadastro">
                Criar conta
            </Link>
        </div>
    )
}
