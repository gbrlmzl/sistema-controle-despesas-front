"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetchClient } from "@/lib/apiClient.client";

//Espelha useLogin: roda no client porque o cookie de sessão é limpo pelo
//Set-Cookie da própria resposta, sem precisar de Server Action pra repassar nada.
export function useLogout() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function logout() {
        setIsLoggingOut(true);
        try {
            await apiFetchClient("/auth/logout", { method: "POST", skipAuthRetry: true });
        } catch {
            //Os cookies são httpOnly e não têm como ser limpos manualmente daqui —
            //mesmo se a chamada falhar, seguir para o login é o caminho seguro.
        }

        router.refresh(); //limpa o usuário do contexto (UserProvider)
        router.push("/login");
    }

    return { logout, isLoggingOut };
}
