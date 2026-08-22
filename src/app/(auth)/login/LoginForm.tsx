'use client';
import Form from "next/form";
import Link from 'next/link';

import { useLogin } from "@/hooks/useLogin";
import styles from '../authForm.module.css';

const GOOGLE_LOGIN_URL = "/api/auth/google";

interface LoginFormProps {
    //Vem de process.env.GOOGLE_AUTH_ENABLED, lido pelo Server Component em
    //page.tsx. Falso por padrão: hoje a API não tem as 4 variáveis do OAuth
    //configuradas em produção, então a rota nem existe no Express — mostrar o
    //botão levaria a um 404 sem explicação. A ativação depende do domínio
    //próprio (a URL de callback precisa ser real e registrada no Google
    //Cloud Console) — até lá, esta flag fica false em produção.
    googleAuthEnabled?: boolean;
}

export default function LoginForm({ googleAuthEnabled = false }: LoginFormProps) {
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

                <Link href="/forgot-password" className={styles.esqueciSenha}>Esqueci minha senha</Link>

                <button type="submit" className={styles.botaoEnviar} disabled={isPending || !dadosPreenchidos}>
                    {isPending ? "Entrando..." : "Entrar"}
                </button>
            </Form>

            {googleAuthEnabled && (
                <>
                    <div className={styles.separador}>ou</div>

                    <a href={GOOGLE_LOGIN_URL} className={styles.botaoGoogle}>
                        <img src="/icons/googleIcon.svg" alt="" />
                        Continuar com Google
                    </a>
                </>
            )}

            <p className={styles.rodape}>
                Ainda não tem conta? <Link href="/register">Criar conta</Link>
            </p>
        </div>
    )
}
