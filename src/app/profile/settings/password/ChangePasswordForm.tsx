'use client'
import styles from './ChangePasswordForm.module.css';
import changePasswordAction from "./changePasswordAction";
import { useActionState, useEffect } from "react";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Link from 'next/link';


export default function ChangePasswordForm() {
    const [state, formAction, isPending] = useActionState(changePasswordAction, null);  // Hook para gerenciar o estado da ação do formulário
    //isPending -> indica se a ação do formulário está em andamento, desabilitando o botão de envio para evitar envios múltiplos.
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [atLeast8Chars, setAtLeast8Chars] = useState(false);
    const [hasNumberOrSymbol, setHasNumberOrSymbol] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);


    const dadosPreenchidos = atLeast8Chars && hasNumberOrSymbol && passwordsMatch && currentPassword.length > 0;
    useEffect(() => {
        setAtLeast8Chars(newPassword.length >= 8);
        setHasNumberOrSymbol(/[\d\W]/.test(newPassword));
        setPasswordsMatch(newPassword.length !== 0 && newPassword === confirmNewPassword);
    }, [newPassword, confirmNewPassword]);
    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    }


    if(state?.success){
        return (
            <div className={styles.container}>
                <div className={styles.successMessageTitleContainer}>
                    <h2>Configurações da conta</h2>
                    <h3>Mudar senha</h3>
                </div>
                <span className={styles.successMessageIcon}>
                    <img src="/icons/checkedIcon.svg" alt="Success" />
                </span>

                <div className={styles.successMessageContainer}>
                    <span className={styles.successMessageText}>Senha alterada com sucesso!</span>
                </div>

                <Link href="/" className={styles.linkButton}><span>Início</span></Link>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <h2>Configurações da conta</h2>
            <h3>Mudar senha</h3>
            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span className={styles.errorMessageText}>{state?.message}</span>
                </div>
            )}
            <Form action={formAction}>
                <div className={styles.formFields}>
                    <div className={styles.passwordField}>
                        <input type={showPassword ? 'text' : 'password'} name="currentPassword" placeholder="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        <span className={styles.passwordToggle} onClick={togglePasswordVisibility}>
                            {showPassword ? (
                                <img src="/icons/olhoIcon.svg" alt="Mostrar/Ocultar senha" />
                            ) : (
                                <img src="/icons/olhoCortadoIcon.svg" alt="Mostrar/Ocultar senha" />)
                            }

                        </span>
                    </div>
                    <div className={styles.passwordField}>
                        <input type={showPassword ? 'text' : 'password'} name="newPassword" placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className={styles.passwordField}>
                        <input type={showPassword ? 'text' : 'password'} name="confirmNewPassword" placeholder="Confirmar nova senha" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                    </div>
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
                <div className={styles.submitButtonContainer}>
                    <button type="submit" disabled={isPending || !dadosPreenchidos}>
                        <span>
                            <img src="/icons/avancarIcon.svg" alt="Login" />
                        </span>
                    </button>
                </div>



            </Form>
        </div>
    )
}
