"use client";

import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { registerSchema } from "@/schemas/usuarios";
import type { ActionState } from "@/types/actions";
import type { AuthUser } from "@/types/auth";

//Roda no client, não como Server Action — mesma razão já registrada em
//useLogin.ts: o cookie de sessão (JWT/REFRESH) vem no Set-Cookie da resposta de
///auth/register e é o próprio navegador que o grava, então não há nada que
//exija o servidor no meio (ver src/app/api/[...path]/route.ts, que proxia
///api/* pra API na mesma origem).
//
//Era uma Server Action, e isso custava caro: a resposta de uma Server Action
//carrega junto um render RSC da rota atual (/register), que chegava ao mesmo
//tempo que o router.push("/") disparado no efeito de sucesso do RegisterForm.
//Duas operações mexendo na árvore RSC ao mesmo tempo — exatamente a classe de
//bug que docs/decisao-sincronizacao-usuario-pos-acao.md descreve na seção 2 e
//que a remoção do router.refresh() resolveu só para o par refresh+push. Quando
//as duas colidiam (carga alta ou primeira carga fria), a navegação morria no
//boundary de erro: o usuário terminava o cadastro em "Não foi possível
//carregar esta página", ainda em /register. Reproduzia em ~10% dos cadastros
//num servidor recém-subido e em ~30% num servidor sob martelo (medido com
//cypress/e2e/entrar-residencia-codigo.cy.ts em repetição).
//
//Sem a Server Action, o cadastro vira um fetch comum e o push("/") passa a ser
//a única operação tocando a árvore RSC — o mesmo desenho que o login já usava
//e que nunca apresentou essa falha.
export default async function registerAction(_prevState: ActionState<AuthUser> | null, formData: FormData): Promise<ActionState<AuthUser>> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    //O nome de usuário é sempre normalizado (sem espaços nas pontas e em minúsculas)
    //antes da validação, para que "Gabriel" e "gabriel " sejam o mesmo identificador.
    data.username = data.username?.trim().toLowerCase() ?? "";

    // 1 -> Se não tiver email, nome, nome de usuário ou senha, retorna erro
    if (!data.email || !data.name || !data.username || !data.password || !data.confirmPassword) {
        return {
            message: 'Não pode haver campos vazios',
            success: false,
        }
    }

    // 2 -> Valida os dados do formulário usando o schema do Zod
    const parseResult = registerSchema.safeParse(data);
    if (!parseResult.success) {
        const firstError = parseResult.error.issues[0];
        return {
            message: firstError.message,
            success: false,
        }
    }

    //3 -> O formato dos dados está válido, extrai os dados validados
    const payload = parseResult.data;

    //4 -> Cadastra o usuário na API — ela já valida email/username em uso e, em caso de
    //sucesso, já estabelece a sessão (cookies JWT + REFRESH), diferente do fluxo
    //antigo que só criava o usuário e mandava pro /login.
    try {
        //A API devolve o AuthUser atualizado no corpo da resposta (mesmo shape de
        //login/refresh/GET/PATCH users/me) — repassado no "data" pro chamador poder
        //atualizar o UserProvider direto, sem precisar de router.refresh().
        const { user } = await apiFetchClient<{ user: AuthUser }>("/auth/register", {
            method: "POST",
            skipAuthRetry: true,
            body: {
                name: payload.name,
                username: payload.username,
                email: payload.email,
                password: payload.password,
                confirmPassword: payload.confirmPassword,
            },
        });

        return {
            success: true,
            message: 'Usuário cadastrado com sucesso!',
            data: user,
        }
    } catch (e) {
        if (e instanceof ApiError) {
            return { message: e.message, success: false };
        }
        return {
            message: 'Erro ao cadastrar usuário. Tente novamente mais tarde.',
            success: false,
        }
    }
}
