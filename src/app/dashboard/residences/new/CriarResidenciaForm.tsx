'use client'

import criarResidenciaAction from "./criarResidenciaAction";
import { useActionState, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";
import Link from "next/link";

import ResidenciaCriadaModal from "./ResidenciaCriadaModal";
import styles from './CriarResidenciaForm.module.css';


export default function CriarResidenciaForm() {
    const [state, formAction, isPending] = useActionState(criarResidenciaAction, null); // Hook para gerenciar o estado da ação do formulário
    //isPending -> indica se a ação do formulário está em andamento, desabilitando o botão de envio para evitar envios múltiplos.
    const [name, setName] = useState('');
    const router = useRouter();

    //Mesmo mínimo exigido pelo residenceNameSchema, para o usuário não enviar um nome que já se sabe inválido
    const nomePreenchido = name.trim().length >= 3;

    //Ao confirmar o modal, o usuário é levado ao painel da residência recém-criada.
    //Só é chamado quando o modal está montado, e o modal só monta com state.data presente.
    const handleConfirmar = () => {
        router.push(`/dashboard/residences/${state!.data!.code}`);
    }

    //CA-1 da US-007 -> convidar leva à lista de membros da residência com o modal de
    //convite já aberto, evitando manter duas cópias da mesma tela de convite.
    const handleConvidar = () => {
        router.push(`/dashboard/residences/${state!.data!.code}/members?convidar=1`);
    }

    return (
        <div className={styles.container}>
            <div className={styles.cabecalho}>
                <Link href="/dashboard/residences" className={styles.botaoCanto} aria-label="Retornar ao menu" title="Retornar ao menu">
                    <img src="/icons/voltarIcon.svg" alt="Retornar ao menu" width={22} height={22} />
                </Link>
                <h2>Criar residência</h2>
                <span className={styles.espacoCanto} />
            </div>
            {state?.success === false && (
                <div className={styles.errorMessage}>
                    <span className={styles.errorMessageText}>{state?.message}</span>
                </div>
            )}
            <Form action={formAction}>
                <div className={styles.formFields}>
                    <input type="text" name="name" placeholder="Nome da residência" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
                    <span className={styles.fieldHint}>De 3 a 40 caracteres, apenas letras, números e espaços</span>
                </div>
                <div className={styles.submitButtonContainer}>
                    <button type="submit" disabled={isPending || !nomePreenchido}>
                        <span>
                            <img src="/icons/avancarIcon.svg" alt="Criar residência" />
                        </span>
                    </button>
                </div>
            </Form>
            {state?.success && state?.data && (
                <ResidenciaCriadaModal
                    residencia={state.data}
                    onConvidar={handleConvidar}
                    onConfirmar={handleConfirmar} />
            )}
        </div>
    )
}
