'use server'

import { apiFetch, ApiError } from "@/lib/apiClient";
import { registerSchema } from "@/schemas/usuarios";
import type { ActionState } from "@/types/actions";
import type { AuthUser } from "@/types/auth";

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
        const { user } = await apiFetch<{ user: AuthUser }>("/auth/register", {
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
