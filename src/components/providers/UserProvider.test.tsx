import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
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

function renderComProvider(user: AuthUser | null) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <UserProvider user={user}>{children}</UserProvider>
    );
    return renderHook(() => ({ user: useCurrentUser(), setUser: useSetCurrentUser() }), { wrapper });
}

describe("UserProvider", () => {
    it("useCurrentUser() devolve null fora de um UserProvider", () => {
        const { result } = renderHook(() => useCurrentUser());
        expect(result.current).toBeNull();
    });

    it("hidrata o contexto com o usuário recebido do servidor", () => {
        const { result } = renderComProvider(USUARIO);
        expect(result.current.user).toEqual(USUARIO);
    });

    it("useSetCurrentUser() atualiza o usuário no contexto sem precisar de nova prop", () => {
        const { result } = renderComProvider(null);
        expect(result.current.user).toBeNull();

        act(() => {
            result.current.setUser(USUARIO);
        });

        expect(result.current.user).toEqual(USUARIO);
    });

    it("useSetCurrentUser() troca de usuário (ex.: edição de perfil) preservando a identidade do Provider", () => {
        const { result } = renderComProvider(USUARIO);

        act(() => {
            result.current.setUser(OUTRO_USUARIO);
        });

        expect(result.current.user).toEqual(OUTRO_USUARIO);
    });

    it("useSetCurrentUser() limpa o usuário no logout", () => {
        const { result } = renderComProvider(USUARIO);

        act(() => {
            result.current.setUser(null);
        });

        expect(result.current.user).toBeNull();
    });

    it("useSetCurrentUser() faz merge, preservando campos que a resposta da action não trouxe (ex.: hasPassword)", () => {
        //hasPassword só vem em GET /users/me (ver types/auth.ts) — login, cadastro e
        //PATCH /users/me não devolvem esse campo. Substituir o objeto inteiro faria a
        //UI perder essa informação (ex.: link "Alterar senha" some) a cada ação.
        const usuarioComSenha: AuthUser = { ...USUARIO, hasPassword: true };
        const { result } = renderComProvider(usuarioComSenha);

        act(() => {
            result.current.setUser({ ...USUARIO, name: "Victor Hugo Editado" });
        });

        expect(result.current.user).toEqual({ ...USUARIO, name: "Victor Hugo Editado", hasPassword: true });
    });
});
