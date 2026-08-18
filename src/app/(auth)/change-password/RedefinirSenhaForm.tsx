'use client'
import Form from "next/form";
import Link from "next/link";
import { useState } from "react";

import { useRedefinirSenha } from "@/hooks/useRedefinirSenha";
import styles from '../authForm.module.css';

export default function RedefinirSenhaForm() {
    const { token, estado, state, formAction, isPending } = useRedefinirSenha();
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    //F-05: condições calculadas no render, sem useState/useEffect — copiado do
    //RegisterForm, que já é o padrão certo (ver commit dabb4ed).
    const atLeast8Chars = newPassword.length >= 8;
    const hasNumberOrSymbol = /[\d\W]/.test(newPassword);
    const passwordsMatch = newPassword.length !== 0 && newPassword === confirmNewPassword;

    const dadosPreenchidos = atLeast8Chars && hasNumberOrSymbol && passwordsMatch;
    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    }

    const condicao = (atendida: boolean, texto: string) => (
        <li className={`${styles.condicao} ${atendida ? styles.condicaoAtendida : ''}`}>
            <img src={atendida ? "/icons/checkedIcon.svg" : "/icons/uncheckedIcon.svg"}
                alt={atendida ? "Condição atendida" : "Condição não atendida"} />
            {texto}
        </li>
    );

    if (estado === "verificando") {
        return <p className={styles.subtitulo}>Verificando o link...</p>;
    }

    //F-07: sem token, ou token que o /verify recusou — nenhum campo de senha chega
    //a aparecer, pra não deixar o usuário escolher senha e só depois descobrir que
    //o link já morreu.
    if (estado === "invalido") {
        return (
            <div>
                <h1 className={styles.titulo}>Este link expirou ou já foi usado</h1>
                <p className={styles.subtitulo}>Peça um novo link para redefinir sua senha.</p>
                <Link href="/forgot-password" className={styles.botaoEnviar}>Esqueci minha senha</Link>
            </div>
        );
    }

    return (
        <div>
            <h1 className={styles.titulo}>Redefinir senha</h1>
            <p className={styles.subtitulo}>Escolha uma nova senha para sua conta.</p>

            {state?.success === false && (
                <div className={styles.erro}>
                    <span>{state.message}</span>
                </div>
            )}

            <Form action={formAction} noValidate>
                <input type="hidden" name="token" value={token} />

                <div className={styles.campos}>
                    <div className={styles.campoSenha}>
                        <input type={showPassword ? 'text' : 'password'} name="newPassword" placeholder="Nova senha"
                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                        <span className={styles.alternarSenha} onClick={togglePasswordVisibility}>
                            <img src={showPassword ? "/icons/olhoIcon.svg" : "/icons/olhoCortadoIcon.svg"}
                                alt="Mostrar/Ocultar senha" />
                        </span>
                    </div>

                    <input type={showPassword ? 'text' : 'password'} name="confirmNewPassword" placeholder="Confirmar nova senha"
                        value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} autoComplete="new-password" />
                </div>

                <ul className={styles.condicoes}>
                    {condicao(atLeast8Chars, "Ao menos 8 caracteres")}
                    {condicao(hasNumberOrSymbol, "Deve conter um número ou símbolo")}
                    {condicao(passwordsMatch, "As senhas devem coincidir")}
                </ul>

                <button type="submit" className={styles.botaoEnviar} disabled={isPending || !dadosPreenchidos}>
                    {isPending ? "Redefinindo..." : "Redefinir senha"}
                </button>
            </Form>
        </div>
    )
}
