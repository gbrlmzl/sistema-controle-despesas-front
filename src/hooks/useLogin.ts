"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import type { ActionState } from "@/types/actions";

//Roda no client: o cookie de sessão (JWT/refreshToken) vem do Set-Cookie da
//resposta e é setado pelo próprio navegador — não precisa de Server Action pra
//repassar cookie manualmente (ver next.config.ts, que proxia /api/* pra API).
async function loginAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    try {
        await apiFetchClient("/auth/login", {
            method: "POST",
            skipAuthRetry: true,
            body: {
                username: formData.get("username"),
                password: formData.get("password"),
            },
        });

        return { success: true, message: "" };
    } catch (e) {
        if (e instanceof ApiError) {
            return { success: false, message: e.message };
        }
        return { success: false, message: "Erro ao conectar à API." };
    }
}

export function useLogin() {
    const [state, formAction, isPending] = useActionState(loginAction, null);
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (state?.success) {
            router.refresh();  // atualiza o usuário no contexto (UserProvider)
            router.push("/"); // redireciona no client
        }
    }, [state?.success, router]);

    const dadosPreenchidos = username.trim().length > 0 && password.trim().length > 0;

    function togglePasswordVisibility() {
        setShowPassword(prev => !prev);
    }

    return {
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
    };
}
