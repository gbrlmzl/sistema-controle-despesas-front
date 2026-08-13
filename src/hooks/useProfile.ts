import { useState } from "react";
import { AVATARS } from "@/lib/avatars";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { useSetCurrentUser } from "@/components/providers/UserProvider";
import type { AuthUser } from "@/types/auth";

export const useProfile = () => {
    const setUser = useSetCurrentUser();

    const [galleryOpen, setGalleryOpen] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [loadingChangeProfilePicture, setLoadingChangeProfilePicture] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarType, setSnackbarType] = useState<"error" | "success">("error");

    const avatars = AVATARS;

    const openGallery = () => {
        setGalleryOpen(true);
    };

    const closeGallery = () => {
        setGalleryOpen(false);
        setSelectedAvatar(null);
    };

    const selectAvatar = (avatar: string) => {
        setSelectedAvatar(avatar);
    };

    const showSnackbar = (msg: string, type?: "error" | "success") => {
        setSnackbarMsg(msg);
        setSnackbarType(type || "error");
        setSnackbarOpen(true);
    };

    const confirmChangeProfilePicture = async () => {
        //Confirma a troca da foto de perfil por um dos avatares pré-definidos
        if (!selectedAvatar) return; // Nenhum avatar selecionado
        if (loadingChangeProfilePicture) return; // Impede execução se já estiver carregando
        setLoadingChangeProfilePicture(true);

        try {
            //A API devolve o AuthUser atualizado no corpo da resposta — atualiza o
            //contexto (UserProvider) direto, sem round-trip via router.refresh(). Ver
            //docs/decisao-sincronizacao-usuario-pos-acao.md.
            const { user } = await apiFetchClient<{ user: AuthUser }>("/users/me", {
                method: "PATCH",
                body: { avatar: selectedAvatar },
            });

            showSnackbar("Foto de perfil atualizada com sucesso!", "success");
            setUser(user);
            closeGallery();
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Erro ao atualizar a foto de perfil.";
            showSnackbar(message);
        } finally {
            setLoadingChangeProfilePicture(false);
        }
    };

    const closeSnackbar = () => {
        setSnackbarOpen(false);
    }

    const startEditName = (currentName: string) => {
        setNameValue(currentName);
        setEditingName(true);
    };

    const cancelEditName = () => {
        setEditingName(false);
        setNameValue("");
    };

    const saveName = async () => {
        //Mesma regra do nameSchema no backend (min 1 / max 100 caracteres)
        const trimmed = nameValue.trim();
        if (trimmed.length === 0 || trimmed.length > 100) {
            showSnackbar("O nome deve ter entre 1 e 100 caracteres.");
            return;
        }
        if (savingName) return;
        setSavingName(true);

        try {
            const { user } = await apiFetchClient<{ user: AuthUser }>("/users/me", {
                method: "PATCH",
                body: { name: trimmed },
            });

            showSnackbar("Nome atualizado com sucesso!", "success");
            setUser(user);
            setEditingName(false);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Erro ao atualizar o nome.";
            showSnackbar(message);
        } finally {
            setSavingName(false);
        }
    };

    return {
        avatars,
        galleryOpen,
        selectedAvatar,
        loadingChangeProfilePicture,
        openGallery,
        closeGallery,
        selectAvatar,
        confirmChangeProfilePicture,
        closeSnackbar,
        snackbarOpen,
        snackbarMsg,
        snackbarType,
        editingName,
        nameValue,
        setNameValue,
        savingName,
        startEditName,
        cancelEditName,
        saveName,

    };
}
