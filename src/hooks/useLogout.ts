"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/apiClient.client";
import { useSetCurrentUser } from "@/components/providers/UserProvider";

//Espelha useLogin: roda no client porque o cookie de sessão é limpo pelo
//Set-Cookie da própria resposta, sem precisar de Server Action pra repassar nada.
export function useLogout() {
    const router = useRouter();
    const setUser = useSetCurrentUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function logout() {
        setIsLoggingOut(true);
        try {
            await apiFetchClient("/auth/logout", { method: "POST", skipAuthRetry: true });
        } catch {
            //Os cookies são httpOnly e não têm como ser limpos manualmente daqui —
            //mesmo se a chamada falhar, seguir para o login é o caminho seguro.
        }

        // Limpa o contexto direto no client, sem round-trip via router.refresh().
        // Ver docs/decisao-sincronizacao-usuario-pos-acao.md.
        setUser(null);
        router.push("/login");
    }

    return { logout, isLoggingOut };
}
