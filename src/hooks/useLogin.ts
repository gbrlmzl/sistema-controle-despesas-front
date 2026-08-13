"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { useSetCurrentUser } from "@/components/providers/UserProvider";
import type { ActionState } from "@/types/actions";
import type { AuthUser } from "@/types/auth";

//Roda no client: o cookie de sessão (JWT/REFRESH) vem do Set-Cookie da
//resposta e é setado pelo próprio navegador — não precisa de Server Action pra
//repassar cookie manualmente (ver next.config.ts, que proxia /api/* pra API).
async function loginAction(_prevState: ActionState<AuthUser> | null, formData: FormData): Promise<ActionState<AuthUser>> {
    try {
        //A API devolve o AuthUser atualizado no corpo da resposta (mesmo shape de
        //registro/refresh/GET/PATCH users/me) — repassado no "data" pro chamador poder
        //atualizar o UserProvider direto, sem precisar de router.refresh().
        const { user } = await apiFetchClient<{ user: AuthUser }>("/auth/login", {
            method: "POST",
            skipAuthRetry: true,
            body: {
                username: formData.get("username"),
                password: formData.get("password"),
            },
        });

        return { success: true, message: "", data: user };
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
    const setUser = useSetCurrentUser();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // A API já devolve o AuthUser atualizado na resposta de /auth/login (ver
        // loginAction) — atualiza o contexto direto no client, sem round-trip via
        // router.refresh(). Ver docs/decisao-sincronizacao-usuario-pos-acao.md.
        if (state?.success && state.data) {
            setUser(state.data);
            router.push("/"); // redireciona no client
        }
    }, [state, router, setUser]);

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
