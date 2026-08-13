'use client'
import registerAction from "./registerAction";
import { useActionState, useEffect } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import { useSetCurrentUser } from "@/components/providers/UserProvider";
import styles from '../authForm.module.css';

const GOOGLE_LOGIN_URL = "/api/auth/google";

export default function RegisterForm() {
    const [state, formAction, isPending] = useActionState(registerAction, null);  // Hook para gerenciar o estado da ação do formulário
    //isPending -> indica se a ação do formulário está em andamento, desabilitando o botão de envio para evitar envios múltiplos.
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [atLeast8Chars, setAtLeast8Chars] = useState(false);
    const [hasNumberOrSymbol, setHasNumberOrSymbol] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const router = useRouter();
    const setUser = useSetCurrentUser();


    //O nome de usuário precisa ter de 3 a 20 caracteres (mesma regra do usernameSchema)
    const usernameValido = username.length >= 3 && username.length <= 20;

    const dadosPreenchidos = email.trim().length > 0 && atLeast8Chars && hasNumberOrSymbol && passwordsMatch && name.trim().length > 0 && usernameValido;
    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    }

    //Mantém o campo sempre no formato aceito pelo servidor enquanto o usuário digita,
    //em vez de deixá-lo errar e só descobrir o problema ao enviar o formulário.
    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    }

    useEffect(() => {
        setAtLeast8Chars(password.length >= 8);
        setHasNumberOrSymbol(/[\d\W]/.test(password));
        setPasswordsMatch(password.length !== 0 && password === confirmPassword);
    }, [password, confirmPassword]);


    useEffect(() => {
        // A API já devolve o AuthUser atualizado na resposta de /auth/register (ver
        // registerAction) — atualiza o contexto direto no client, sem round-trip via
        // router.refresh(). Ver docs/decisao-sincronizacao-usuario-pos-acao.md.
        if (state?.success && state.data) {
            setUser(state.data);
            router.push("/");  // a API já estabelece sessão no registro, não precisa passar por /login
        }
    }, [state, router, setUser]);

    const condicao = (atendida: boolean, texto: string) => (
        <li className={`${styles.condicao} ${atendida ? styles.condicaoAtendida : ''}`}>
            <img src={atendida ? "/icons/checkedIcon.svg" : "/icons/uncheckedIcon.svg"}
                alt={atendida ? "Condição atendida" : "Condição não atendida"} />
            {texto}
        </li>
    );

    return (
        <div>
            <h1 className={styles.titulo}>Crie sua conta</h1>
            <p className={styles.subtitulo}>Depois é só entrar na residência com o código.</p>

            {state?.success === false && (
                <div className={styles.erro}>
                    <span>{state?.message}</span>
                </div>
            )}

            <Form action={formAction}>
                <div className={styles.campos}>
                    <input type="text" name="name" placeholder="Nome" value={name}
                        onChange={(e) => setName(e.target.value)} autoComplete="name" />

                    <input type="text" name="username" placeholder="Nome de usuário" value={username}
                        onChange={handleUsernameChange} autoComplete="username" />

                    <input type="email" name="email" placeholder="Email" value={email}
                        onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

                    <div className={styles.campoSenha}>
                        <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Senha"
                            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                        <span className={styles.alternarSenha} onClick={togglePasswordVisibility}>
                            <img src={showPassword ? "/icons/olhoIcon.svg" : "/icons/olhoCortadoIcon.svg"}
                                alt="Mostrar/Ocultar senha" />
                        </span>
                    </div>

                    <input type={showPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirmar Senha"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </div>

                <ul className={styles.condicoes}>
                    {condicao(atLeast8Chars, "Ao menos 8 caracteres")}
                    {condicao(hasNumberOrSymbol, "Deve conter um número ou símbolo")}
                    {condicao(passwordsMatch, "As senhas devem coincidir")}
                </ul>

                <button type="submit" className={styles.botaoEnviar} disabled={isPending || !dadosPreenchidos}>
                    {isPending ? "Criando conta..." : "Criar conta"}
                </button>
            </Form>

            <div className={styles.separador}>ou</div>

            <a href={GOOGLE_LOGIN_URL} className={styles.botaoGoogle}>
                <img src="/icons/googleIcon.svg" alt="" />
                Continuar com Google
            </a>

            <p className={styles.rodape}>
                Já possuo uma conta. <Link href="/login">Entrar</Link>
            </p>
        </div>
    )
}
