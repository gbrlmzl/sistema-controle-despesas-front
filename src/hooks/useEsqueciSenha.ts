"use client";
import { useActionState, useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { esqueciSenhaSchema } from "@/schemas/usuarios";
import type { ActionState } from "@/types/actions";

//Cortesia visual: o limite que vale de verdade é o do servidor (5/hora por IP, 3/hora
//por conta) — este cooldown só evita clique duplo no "Reenviar" (F-08).
const COOLDOWN_SEGUNDOS = 60;

async function esqueciSenhaAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const parseResult = esqueciSenhaSchema.safeParse({ email: formData.get("email") });
    if (!parseResult.success) {
        return { success: false, message: parseResult.error.issues[0].message };
    }

    try {
        //A API sempre responde 200 aqui, exista ou não a conta (D-03, anti-enumeração) —
        //a mensagem exibida é sempre a que ela devolve, nunca uma string escrita no front.
        const { message } = await apiFetchClient<{ message: string }>("/auth/forgot-password", {
            method: "POST",
            skipAuthRetry: true,
            body: { email: parseResult.data.email },
        });

        return { success: true, message };
    } catch (e) {
        if (e instanceof ApiError) {
            return { success: false, message: e.message };
        }
        return { success: false, message: "Erro ao conectar à API." };
    }
}

export function useEsqueciSenha() {
    const [state, formAction, isPending] = useActionState(esqueciSenhaAction, null);
    const [email, setEmail] = useState("");
    const [segundosRestantes, setSegundosRestantes] = useState(0);

    //Ajusta o cooldown no mesmo render em que o envio teve sucesso — feito aqui, e
    //não num useEffect, pra "Reenviar" já nascer desabilitado, sem um piscar de
    //um render habilitado antes do efeito rodar.
    const [ultimoStateVisto, setUltimoStateVisto] = useState(state);
    if (state !== ultimoStateVisto) {
        setUltimoStateVisto(state);
        if (state?.success) {
            setSegundosRestantes(COOLDOWN_SEGUNDOS);
        }
    }

    useEffect(() => {
        if (segundosRestantes === 0) return;

        const intervalo = setInterval(() => {
            setSegundosRestantes(prev => Math.max(0, prev - 1));
        }, 1_000);

        return () => clearInterval(intervalo);
    }, [segundosRestantes]);

    const dadosPreenchidos = email.trim().length > 0;

    return {
        state,
        formAction,
        isPending,
        email,
        setEmail,
        dadosPreenchidos,
        segundosRestantes,
    };
}
