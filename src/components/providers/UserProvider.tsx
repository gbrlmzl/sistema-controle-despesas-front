"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AuthUser } from "@/types/auth";

const UserContext = createContext<AuthUser | null>(null);
const SetUserContext = createContext<(user: AuthUser | null) => void>(() => { });

//Substitui o useSession() do NextAuth: qualquer Client Component pode ler "quem
//está logado" sem precisar receber isso via prop. O valor inicial vem do servidor
//(ver layout.tsx, que resolve getCurrentUser() e alimenta o Provider); a partir daí
//vira estado client (ver useSetCurrentUser abaixo) — não depende mais de
//router.refresh() pra se manter atualizado. Ver docs/decisao-sincronizacao-usuario-pos-acao.md.
export function useCurrentUser(): AuthUser | null {
    return useContext(UserContext);
}

//Atualiza o usuário no contexto a partir de uma resposta que a própria API já
//devolveu (login, cadastro, logout, edição de perfil sempre respondem com o
//AuthUser atualizado) — sem precisar de um novo round-trip via router.refresh().
//Faz merge com o usuário atual (ver UserProvider abaixo); passe null só para logout.
export function useSetCurrentUser(): (user: AuthUser | null) => void {
    return useContext(SetUserContext);
}

interface UserProviderProps {
    children: ReactNode;
    user: AuthUser | null;
}

export default function UserProvider({ children, user: initialUser }: UserProviderProps) {
    //Só usado como valor inicial: numa navegação client-side esse Provider não
    //desmonta, então uma nova prop "user" vinda de um router.refresh() alheio (de
    //outra parte da árvore) não sobrescreve o estado — quem manda a partir daqui é
    //só useSetCurrentUser().
    const [user, setUserState] = useState(initialUser);

    //Merge, não substituição: login/registro/PATCH users/me devolvem o AuthUser sem
    //"hasPassword" (só GET /users/me preenche esse campo — ver types/auth.ts). Se
    //setUser trocasse o objeto inteiro, cada login/edição de perfil apagaria esse
    //campo do contexto até a próxima carga de página. null (logout) sempre limpa tudo.
    const setUser = useCallback((patch: AuthUser | null) => {
        setUserState(prev => (patch === null ? null : prev ? { ...prev, ...patch } : patch));
    }, []);

    return (
        <UserContext.Provider value={user}>
            <SetUserContext.Provider value={setUser}>
                {children}
            </SetUserContext.Provider>
        </UserContext.Provider>
    );
}
