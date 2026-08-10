'use server'
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { ActionState } from "@/types/actions";

export default async function settingsAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    if (!data.currentPassword || !data.newPassword || !data.confirmNewPassword) {
        return {
            message: 'Não pode haver campos vazios',
            success: false,
        }
    }

    if (data.newPassword.length < 8) {
        return {
            message: 'A nova senha deve ter pelo menos 8 caracteres',
            success: false,
        }
    }

    if (!/[\d\W]/.test(data.newPassword)) {
        return {
            message: 'A nova senha deve conter ao menos um número ou símbolo',
            success: false,
        }
    }

    if (data.newPassword !== data.confirmNewPassword) {
        return {
            message: 'As novas senhas não coincidem',
            success: false,
        }
    }

    try {
        await apiFetch("/users/me/password", {
            method: "PATCH",
            body: {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                confirmNewPassword: data.confirmNewPassword,
            },
        });

        return {
            message: 'Senha atualizada com sucesso',
            success: true,
        }
    } catch (e) {
        if (e instanceof ApiError) {
            return { message: e.message, success: false };
        }
        return {
            message: 'Erro na operação. Tente novamente mais tarde.',
            success: false,
        }
    }
}
