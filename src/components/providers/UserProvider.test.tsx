import { act, render, renderHook, screen } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import UserProvider, { useCurrentUser, useSetCurrentUser } from "./UserProvider";
import type { AuthUser } from "@/types/auth";

const USUARIO: AuthUser = {
    id: 1,
    name: "Victor Hugo",
    username: "victor_25",
    email: "victor@example.com",
    profilePic: null,
};

const OUTRO_USUARIO: AuthUser = {
    id: 2,
    name: "Ana Silva",
    username: "ana",
    email: "ana@example.com",
    profilePic: null,
};

/* O Provider passou a receber uma PROMISE em vez de um usuário resolvido (ver
   docs/refatoracao-contexto-usuario.md), então todo teste que lê o contexto precisa
   de um <Suspense> em volta — useCurrentUser() suspende.

   O render acontece DENTRO de act(): com IS_REACT_ACT_ENVIRONMENT ligado (a RTL
   liga), a retomada de um Suspense é agendada e só é descarregada dentro de um act.
   Renderizar fora e tentar esperar depois (waitFor, act vazio, await da própria
   promise) deixa o componente suspenso para sempre — verificado com um caso mínimo
   de use() + Suspense neste mesmo setup de Jest. */
async function renderComProvider(user: AuthUser | null) {
    const sessao = Promise.resolve(user);

    const wrapper = ({ children }: { children: ReactNode }) => (
        <UserProvider sessao={sessao}>
            <Suspense fallback={null}>{children}</Suspense>
        </UserProvider>
    );

    let utils!: ReturnType<typeof renderHook<{ user: AuthUser | null; setUser: (u: AuthUser | null) => void }, undefined>>;

    await act(async () => {
        utils = renderHook(
            () => ({ user: useCurrentUser(), setUser: useSetCurrentUser() }),
            { wrapper },
        );
    });

    return utils;
}

describe("UserProvider", () => {
    it("useCurrentUser() devolve null fora de um UserProvider", async () => {
        //O contexto padrão é uma promise já resolvida em null. Como o valor esperado
        //É null, não dá para esperar por "deixou de ser null" — esperamos o commit
        //através do DOM de um componente que só renderiza depois de resolver.
        function Sonda() {
            const usuario = useCurrentUser();
            return <span data-testid="sonda">{usuario === null ? "null" : "usuario"}</span>;
        }

        await act(async () => {
            render(<Suspense fallback={null}><Sonda /></Suspense>);
        });

        expect(screen.getByTestId("sonda")).toHaveTextContent("null");
    });

    it("hidrata o contexto com o usuário recebido do servidor", async () => {
        const { result } = await renderComProvider(USUARIO);
        expect(result.current.user).toEqual(USUARIO);
    });

    it("suspende enquanto a sessão não resolve e mostra o fallback", async () => {
        //Este é o comportamento que a mudança introduziu, e é o que permite ao layout
        //raiz não bloquear: quem lê o usuário espera; o resto da árvore, não.
        let resolver: (u: AuthUser | null) => void = () => { };
        const sessao = new Promise<AuthUser | null>(res => { resolver = res; });

        function NomeDoUsuario() {
            const usuario = useCurrentUser();
            return <span>{usuario?.name ?? "sem sessão"}</span>;
        }

        await act(async () => {
            render(
                <UserProvider sessao={sessao}>
                    <Suspense fallback={<span>carregando</span>}>
                        <NomeDoUsuario />
                    </Suspense>
                </UserProvider>,
            );
        });

        //A promise ainda não resolveu: é o fallback que está na tela, não o conteúdo.
        expect(screen.getByText("carregando")).toBeInTheDocument();

        await act(async () => { resolver(USUARIO); });

        expect(screen.getByText("Victor Hugo")).toBeInTheDocument();
    });

    it("useSetCurrentUser() atualiza o usuário no contexto sem precisar de nova prop", async () => {
        const { result } = await renderComProvider(null);
        expect(result.current.user).toBeNull();

        act(() => {
            result.current.setUser(USUARIO);
        });

        expect(result.current.user).toEqual(USUARIO);
    });

    it("useSetCurrentUser() troca de usuário (ex.: edição de perfil) preservando a identidade do Provider", async () => {
        const { result } = await renderComProvider(USUARIO);

        act(() => {
            result.current.setUser(OUTRO_USUARIO);
        });

        expect(result.current.user).toEqual(OUTRO_USUARIO);
    });

    it("useSetCurrentUser() limpa o usuário no logout", async () => {
        const { result } = await renderComProvider(USUARIO);

        act(() => {
            result.current.setUser(null);
        });

        expect(result.current.user).toBeNull();
    });

    it("useSetCurrentUser() faz merge, preservando campos que a resposta da action não trouxe (ex.: hasPassword)", async () => {
        //hasPassword só vem em GET /users/me (ver types/auth.ts) — login, cadastro e
        //PATCH /users/me não devolvem esse campo. Substituir o objeto inteiro faria a
        //UI perder essa informação (ex.: link "Alterar senha" some) a cada ação.
        const usuarioComSenha: AuthUser = { ...USUARIO, hasPassword: true };
        const { result } = await renderComProvider(usuarioComSenha);

        act(() => {
            result.current.setUser({ ...USUARIO, name: "Victor Hugo Editado" });
        });

        expect(result.current.user).toEqual({ ...USUARIO, name: "Victor Hugo Editado", hasPassword: true });
    });

    it("preserva hasPassword ao longo de várias edições seguidas", async () => {
        /* Duas edições de perfil sem recarregar a página. Cada PATCH /users/me
           devolve o AuthUser inteiro já atualizado — mas sempre SEM hasPassword.
           O campo tem que sobreviver às duas, não só à primeira: é ele que decide
           se o link "Alterar senha" aparece. */
        const { result } = await renderComProvider({ ...USUARIO, hasPassword: true });

        act(() => { result.current.setUser({ ...USUARIO, name: "Nome Novo" }); });
        act(() => { result.current.setUser({ ...USUARIO, name: "Nome Novo", profilePic: "/avatars/avatar-03.svg" }); });

        expect(result.current.user).toEqual({
            ...USUARIO,
            name: "Nome Novo",
            profilePic: "/avatars/avatar-03.svg",
            hasPassword: true,
        });
    });

    it("login depois de logout não herda campos do usuário anterior", async () => {
        //Sem o tratamento de "autoritativo", a mescla com o usuário do servidor
        //deixaria o profilePic de quem saiu grudado em quem entrou.
        const { result } = await renderComProvider({ ...USUARIO, profilePic: "/avatars/avatar-01.svg" });

        act(() => { result.current.setUser(null); });
        act(() => { result.current.setUser(OUTRO_USUARIO); });

        expect(result.current.user).toEqual(OUTRO_USUARIO);
        expect(result.current.user?.profilePic).toBeNull();
    });
});
