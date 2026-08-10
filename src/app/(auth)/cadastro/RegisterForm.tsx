'use client'
import registerAction from "./registerAction";
import { useActionState, useEffect } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import styles from './RegisterForm.module.css';

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
        if (state?.success) {
            router.refresh();  // atualiza o usuário no contexto (UserProvider) — o cadastro já loga
            router.push("/");  // a API já estabelece sessão no registro, não precisa passar por /login
        }
    }, [state?.success, router]);

    return (
        <div className={styles.container}>
            <h1>Crie sua conta</h1>
            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span className={styles.errorMessageText}>{state?.message}</span>
                </div>
            )}
            <Form action={formAction}>
                <div className={styles.formFields}>
                    <input type="text" name="name" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
                    <input type="text" name="username" placeholder="Nome de usuário" value={username} onChange={handleUsernameChange} />
                    <input type="email" name="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                    <input type={showPassword ? 'text' : 'password'} name="confirmPassword" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className={styles.passwordConditionsContainer}>
                    <div className={styles.passwordCondition}>
                        {atLeast8Chars ? (
                            <span>
                                <img src="/icons/checkedIcon.svg" alt="Condição atendida" />
                            </span>
                        ) : (
                            <span>
                                <img src="/icons/uncheckedIcon.svg" alt="Condição não atendida" />
                            </span>
                        )}
                        <p>Ao menos 8 caracteres</p>
                    </div>
                    <div className={styles.passwordCondition}>
                        {hasNumberOrSymbol ? (
                            <span>
                                <img src="/icons/checkedIcon.svg" alt="Condição atendida" />
                            </span>
                        ) : (
                            <span>
                                <img src="/icons/uncheckedIcon.svg" alt="Condição não atendida" />
                            </span>
                        )}
                        <p>Deve conter um número ou símbolo </p>
                    </div>
                    <div className={styles.passwordCondition}>
                        {passwordsMatch ? (
                            <span>
                                <img src="/icons/checkedIcon.svg" alt="Condição atendida" />
                            </span>
                        ) : (
                            <span>
                                <img src="/icons/uncheckedIcon.svg" alt="Condição não atendida" />
                            </span>
                        )}
                        <p>As senhas devem coincidir</p>
                    </div>
                </div>
                <div className={styles.socialMediaLoginContainer}>
                    <p>Ou crie uma conta com</p>
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
            <Link href="/login" className={styles.loginLink}>Já possuo uma conta</Link>
        </div>
    )
}
