"use client";

import { createContext, use, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "@/types/auth";

/* ============================================================================
   O contexto guarda uma PROMISE, não um usuário resolvido.

   Antes, o layout raiz fazia `const user = await getCurrentUser()` e passava o
   valor pronto. Isso custava caro: pela regra do App Router, um layout que lê
   dado de runtime (cookies) BLOQUEIA a navegação inteira até terminar de
   renderizar — e nenhum loading.tsx aparece enquanto isso. Como getCurrentUser()
   roda no layout raiz, toda página do app pagava esse bloqueio.

   Agora o layout chama getCurrentUser() SEM await e entrega a promise aqui. O
   layout termina de renderizar na hora, a casca (AppShell, navegação, tema) vai
   pro navegador imediatamente, e só quem realmente precisa do usuário — hoje o
   avatar e as chamadas da landing — suspende dentro do próprio <Suspense>.

   Ver docs/refatoracao-contexto-usuario.md para o antes/depois completo.
   ========================================================================== */

/* Uma alteração vinda do cliente. `autoritativo` distingue os dois casos que
   precisam de tratamento diferente na leitura:

   - patch (autoritativo: false) — PATCH /users/me devolve o AuthUser sem o campo
     `hasPassword` (só GET /users/me preenche ele, ver types/auth.ts). O valor tem
     que ser mesclado POR CIMA do usuário do servidor, senão editar o perfil
     apagaria esse campo do contexto até a próxima carga de página.

   - sessão (autoritativo: true) — logout e login trocam de identidade. Aqui
     mesclar seria errado: sobraria campo do usuário anterior. O valor substitui. */
interface AlteracaoLocal {
    autoritativo: boolean;
    valor: AuthUser | null;
}

interface ValorContexto {
    sessao: Promise<AuthUser | null>;
    alteracao: AlteracaoLocal | null;
}

/* Fora de um Provider (testes de unidade que montam um componente isolado) o
   contexto resolve para "deslogado" em vez de explodir. A promise é criada uma
   vez no módulo, e não a cada render, porque use() exige instância estável —
   uma promise nova a cada render faria o Suspense reexibir o fallback em loop. */
const SESSAO_VAZIA: Promise<AuthUser | null> = Promise.resolve(null);

const UserContext = createContext<ValorContexto>({ sessao: SESSAO_VAZIA, alteracao: null });
const SetUserContext = createContext<(user: AuthUser | null) => void>(() => { });

/**
 * "Quem está logado". Substitui o useSession() do NextAuth.
 *
 * ATENÇÃO: este hook SUSPENDE enquanto a sessão não resolveu. Todo componente
 * que o chama precisa estar dentro de um <Suspense> com um fallback do mesmo
 * tamanho do conteúdo final — sem isso o boundary mais próximo sobe, e o ganho
 * de não bloquear o layout se perde.
 */
export function useCurrentUser(): AuthUser | null {
    const { sessao, alteracao } = useContext(UserContext);

    /* use() é a única API do React que pode ser chamada dentro de condicional
       ("Unlike Hooks, it can be called inside loops and conditional statements
       like if" — react.dev/reference/react/use). Aproveitamos isso: depois de um
       login ou logout já sabemos a resposta, então não há motivo para tocar na
       promise — e não tocar nela evita suspender de novo caso o servidor mande
       uma promise nova (um router.refresh(), por exemplo). */
    if (alteracao?.autoritativo) {
        return alteracao.valor;
    }

    const usuarioDoServidor = use(sessao);

    if (!alteracao) {
        return usuarioDoServidor;
    }

    /* Merge no momento da LEITURA, não no da escrita: quem escreve (useProfile)
       não tem como esperar a promise resolver para mesclar. */
    return usuarioDoServidor
        ? { ...usuarioDoServidor, ...alteracao.valor }
        : alteracao.valor;
}

/**
 * Atualiza o usuário do contexto a partir de uma resposta que a API já devolveu
 * (login, cadastro, logout e edição de perfil sempre respondem com o AuthUser),
 * sem um novo round-trip via router.refresh().
 *
 * Passe `null` para logout. Este hook NÃO suspende — de propósito: os hooks que
 * só escrevem (useLogin, useLogout, useProfile, RegisterForm) não devem ficar
 * presos à resolução da sessão.
 */
export function useSetCurrentUser(): (user: AuthUser | null) => void {
    return useContext(SetUserContext);
}

interface UserProviderProps {
    children: ReactNode;
    /** Promise vinda do Server Component — ver app/layout.tsx. Nunca `await` lá. */
    sessao: Promise<AuthUser | null>;
}

export default function UserProvider({ children, sessao }: UserProviderProps) {
    const [alteracao, setAlteracao] = useState<AlteracaoLocal | null>(null);

    const setUser = useCallback((patch: AuthUser | null) => {
        setAlteracao(anterior => {
            //Logout: identidade some. Autoritativo, sem merge.
            if (patch === null) {
                return { autoritativo: true, valor: null };
            }

            //Login logo depois de um logout na mesma montagem: é outra identidade,
            //e mesclar com o usuário anterior deixaria campos órfãos (o profilePic
            //de quem saiu, por exemplo). Também autoritativo.
            if (anterior?.autoritativo) {
                return { autoritativo: true, valor: patch };
            }

            //Edição de perfil: acumula sobre o patch anterior, para que duas edições
            //seguidas (nome e depois avatar) não se anulem. A mescla com o usuário
            //do servidor acontece na leitura, em useCurrentUser.
            return {
                autoritativo: false,
                valor: anterior?.valor ? { ...anterior.valor, ...patch } : patch,
            };
        });
    }, []);

    /* Sem useMemo, o objeto do contexto seria novo a cada render do Provider e
       obrigaria todo consumidor a re-renderizar junto. */
    const valor = useMemo<ValorContexto>(() => ({ sessao, alteracao }), [sessao, alteracao]);

    return (
        <UserContext value={valor}>
            <SetUserContext value={setUser}>
                {children}
            </SetUserContext>
        </UserContext>
    );
}
