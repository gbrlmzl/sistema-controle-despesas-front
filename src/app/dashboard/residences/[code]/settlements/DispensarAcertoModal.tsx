'use client'

import { useActionState, useEffect, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";

import dispensarAcertoAction from "./dispensarAcertoAction";
import { formatarValor } from "@/utils/dinheiro";
import styles from './DispensarAcertoModal.module.css';
import type { Acerto } from "@/types/acerto";

const MOTIVO_MIN = 3;
const MOTIVO_MAX = 200;

interface DispensarAcertoModalProps {
    code: string;
    month: number;
    year: number;
    acerto: Pick<Acerto, "id" | "payer" | "receiver" | "amountInCents">;
    onFechar: () => void;
}

//D-07/RN-082 -> dispensa exige motivo, então é form-modal (F-18), no molde de
//EditarDespesaModal.tsx -- diferente de ConfirmacaoModal.tsx, que não tem campo.
export default function DispensarAcertoModal({ code, month, year, acerto, onFechar }: DispensarAcertoModalProps) {
    const [state, formAction, isPending] = useActionState(dispensarAcertoAction, null);
    const [reason, setReason] = useState("");
    const router = useRouter();

    const motivoValido = reason.trim().length >= MOTIVO_MIN;

    useEffect(() => {
        if (state?.success) {
            router.refresh();
            onFechar();
        }
    }, [state?.success, router]);

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloDispensarAcerto">
            <div className={styles.modal}>
                <h3 id="tituloDispensarAcerto">Dispensar acerto</h3>

                <p className={styles.resumoAcerto}>
                    {acerto.payer.name} → {acerto.receiver.name} · <span className="num">{formatarValor(acerto.amountInCents)}</span>
                </p>
                <p className={styles.aviso}>
                    A dispensa vale para os dois lados deste acerto, mesmo que só um deles esteja
                    pendente. Não é o mesmo que liquidar, e não pode ser desfeita.
                </p>

                {state?.success === false && (
                    <div className={styles.errorMessage}>
                        <span>{state?.message}</span>
                    </div>
                )}

                <Form action={formAction} className={styles.form}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="year" value={year} />
                    <input type="hidden" name="settlementId" value={acerto.id} />

                    <textarea name="reason" value={reason} maxLength={MOTIVO_MAX} rows={3}
                        placeholder="Explique o motivo da dispensa"
                        onChange={(e) => setReason(e.target.value)} />
                    <span className={styles.contador}>{reason.length}/{MOTIVO_MAX}</span>

                    <div className={styles.botoesContainer}>
                        <button type="button" className={styles.botaoSecundario} onClick={onFechar} disabled={isPending}>Cancelar</button>
                        <button type="submit" className={styles.botaoPrimario} disabled={isPending || !motivoValido}>Dispensar</button>
                    </div>
                </Form>
            </div>
        </div>
    )
}
