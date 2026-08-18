"use client";
import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { useLogout } from "@/hooks/useLogout";
import { redefinirSenhaSchema } from "@/schemas/usuarios";
import type { ActionState } from "@/types/actions";

//"data" carrega o status HTTP só quando a submissão falha, pra useRedefinirSenha
//distinguir um 400 (token morreu entre a verificação e o envio) de qualquer outro erro.
type SubmissaoState = ActionState<number>;

async function redefinirSenhaAction(_prevState: SubmissaoState | null, formData: FormData): Promise<SubmissaoState> {
    const parseResult = redefinirSenhaSchema.safeParse({
        token: formData.get("token"),
        newPassword: formData.get("newPassword"),
        confirmNewPassword: formData.get("confirmNewPassword"),
    });
    if (!parseResult.success) {
        return { success: false, message: parseResult.error.issues[0].message };
    }

    try {
        //Sucesso não abre sessão (D-06): a resposta não traz cookie nem AuthUser.
        const { message } = await apiFetchClient<{ message: string }>("/auth/reset-password", {
            method: "POST",
            skipAuthRetry: true,
            body: parseResult.data,
        });

        return { success: true, message };
    } catch (e) {
        if (e instanceof ApiError) {
            return { success: false, message: e.message, data: e.status };
        }
        return { success: false, message: "Erro ao conectar à API." };
    }
}

export type EstadoVerificacao = "verificando" | "invalido" | "valido";

export function useRedefinirSenha() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { logout } = useLogout();

    //F-06: captura o token no inicializador, antes de a query ser limpa — senão o
    //valor some junto com ela.
    const [token] = useState(() => searchParams.get("token") ?? "");
    const [estado, setEstado] = useState<EstadoVerificacao>(token ? "verificando" : "invalido");

    useEffect(() => {
        // Roda uma única vez: tira o token da URL (histórico do navegador e header
        // Referer não deveriam carregar credencial nenhuma — D-10).
        router.replace(pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        //Sem token, nem vale a pena chamar a API (F-07).
        if (!token) return;

        let cancelado = false;
        apiFetchClient<{ valid: true }>("/auth/reset-password/verify", {
            method: "POST",
            skipAuthRetry: true,
            body: { token },
        })
            .then(() => {
                if (!cancelado) setEstado("valido");
            })
            .catch(() => {
                if (!cancelado) setEstado("invalido");
            });

        return () => {
            cancelado = true;
        };
    }, [token]);

    const [state, formAction, isPending] = useActionState(redefinirSenhaAction, null);

    useEffect(() => {
        if (state?.success) {
            //F-09: revogar os refresh tokens não invalida um access token já no
            //navegador — sem isso o proxy vê o cookie JWT ainda válido e barra o /login.
            logout();
        } else if (state?.success === false && state.data === 400) {
            //O token expirou (ou foi usado) entre o /verify e o envio — mesma tela de
            //link inválido, não um erro de formulário.
            setEstado("invalido");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    return { token, estado, state, formAction, isPending };
}
