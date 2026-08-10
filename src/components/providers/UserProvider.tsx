"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthUser } from "@/types/auth";

const UserContext = createContext<AuthUser | null>(null);

//Substitui o useSession() do NextAuth: qualquer Client Component pode ler "quem
//está logado" sem precisar receber isso via prop. O valor vem do servidor (ver
//layout.tsx, que resolve getCurrentUser() e alimenta o Provider) — pra atualizar
//depois de login/logout/cadastro, o componente que disparou a ação chama
//router.refresh(), que refaz a árvore de Server Components (incluindo o layout) e
//propaga o novo valor pro contexto.
export function useCurrentUser(): AuthUser | null {
    return useContext(UserContext);
}

interface UserProviderProps {
    children: ReactNode;
    user: AuthUser | null;
}

export default function UserProvider({ children, user }: UserProviderProps) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
