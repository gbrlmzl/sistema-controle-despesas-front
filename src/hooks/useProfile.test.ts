import { act, renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "./useProfile";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { AVATARS } from "@/lib/avatars";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

describe("useProfile", () => {
    it("expõe a lista de avatares disponíveis e começa com a galeria fechada", () => {
        const { result } = renderHook(() => useProfile({}));

        expect(result.current.avatars).toBe(AVATARS);
        expect(result.current.galleryOpen).toBe(false);
        expect(result.current.selectedAvatar).toBeNull();
    });

    it("abre e fecha a galeria, limpando o avatar selecionado ao fechar", () => {
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.openGallery();
        });
        expect(result.current.galleryOpen).toBe(true);

        act(() => {
            result.current.selectAvatar(AVATARS[0]);
        });
        expect(result.current.selectedAvatar).toBe(AVATARS[0]);

        act(() => {
            result.current.closeGallery();
        });
        expect(result.current.galleryOpen).toBe(false);
        expect(result.current.selectedAvatar).toBeNull();
    });

    it("confirmChangeProfilePicture não faz nada quando nenhum avatar foi selecionado", async () => {
        const { result } = renderHook(() => useProfile({}));

        await act(async () => {
            await result.current.confirmChangeProfilePicture();
        });

        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("confirmChangeProfilePicture atualiza o avatar, notifica o callback e fecha a galeria", async () => {
        mockApiFetchClient.mockResolvedValue(undefined);
        const onProfileUpdated = jest.fn();
        const { result } = renderHook(() => useProfile({ onProfileUpdated }));

        act(() => {
            result.current.openGallery();
            result.current.selectAvatar(AVATARS[2]);
        });

        await act(async () => {
            await result.current.confirmChangeProfilePicture();
        });

        expect(mockApiFetchClient).toHaveBeenCalledWith("/users/me", { method: "PATCH", body: { avatar: AVATARS[2] } });
        expect(onProfileUpdated).toHaveBeenCalled();
        expect(result.current.galleryOpen).toBe(false);
        expect(result.current.snackbarOpen).toBe(true);
        expect(result.current.snackbarType).toBe("success");
    });

    it("confirmChangeProfilePicture exibe a mensagem de erro da API quando falha", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(400, "Avatar inválido"));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.selectAvatar(AVATARS[0]);
        });

        await act(async () => {
            await result.current.confirmChangeProfilePicture();
        });

        expect(result.current.snackbarType).toBe("error");
        expect(result.current.snackbarMsg).toBe("Avatar inválido");
    });

    it("confirmChangeProfilePicture usa mensagem genérica para erro não-ApiError", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("timeout"));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.selectAvatar(AVATARS[0]);
        });

        await act(async () => {
            await result.current.confirmChangeProfilePicture();
        });

        expect(result.current.snackbarMsg).toBe("Erro ao atualizar a foto de perfil.");
    });

    it("confirmChangeProfilePicture ignora chamadas concorrentes enquanto uma já está em andamento", async () => {
        let resolveFetch!: () => void;
        mockApiFetchClient.mockReturnValue(new Promise(resolve => { resolveFetch = () => resolve(undefined); }));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.selectAvatar(AVATARS[0]);
        });

        act(() => {
            result.current.confirmChangeProfilePicture();
        });
        await waitFor(() => expect(result.current.loadingChangeProfilePicture).toBe(true));

        act(() => {
            result.current.confirmChangeProfilePicture();
        });

        expect(mockApiFetchClient).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveFetch();
        });
    });

    it("closeSnackbar fecha a snackbar", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("erro"));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.selectAvatar(AVATARS[0]);
        });
        await act(async () => {
            await result.current.confirmChangeProfilePicture();
        });
        expect(result.current.snackbarOpen).toBe(true);

        act(() => {
            result.current.closeSnackbar();
        });
        expect(result.current.snackbarOpen).toBe(false);
    });

    it("startEditName preenche o valor atual e entra em modo de edição; cancelEditName limpa tudo", () => {
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.startEditName("Victor");
        });
        expect(result.current.editingName).toBe(true);
        expect(result.current.nameValue).toBe("Victor");

        act(() => {
            result.current.cancelEditName();
        });
        expect(result.current.editingName).toBe(false);
        expect(result.current.nameValue).toBe("");
    });

    it("saveName rejeita nome vazio sem chamar a API", async () => {
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.setNameValue("   ");
        });

        await act(async () => {
            await result.current.saveName();
        });

        expect(mockApiFetchClient).not.toHaveBeenCalled();
        expect(result.current.snackbarMsg).toBe("O nome deve ter entre 1 e 100 caracteres.");
    });

    it("saveName rejeita nome maior que 100 caracteres sem chamar a API", async () => {
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.setNameValue("a".repeat(101));
        });

        await act(async () => {
            await result.current.saveName();
        });

        expect(mockApiFetchClient).not.toHaveBeenCalled();
        expect(result.current.snackbarMsg).toBe("O nome deve ter entre 1 e 100 caracteres.");
    });

    it("saveName envia o nome já sem espaços nas pontas, notifica o callback e sai do modo de edição", async () => {
        mockApiFetchClient.mockResolvedValue(undefined);
        const onProfileUpdated = jest.fn();
        const { result } = renderHook(() => useProfile({ onProfileUpdated }));

        act(() => {
            result.current.setNameValue("  Victor Hugo  ");
        });

        await act(async () => {
            await result.current.saveName();
        });

        expect(mockApiFetchClient).toHaveBeenCalledWith("/users/me", { method: "PATCH", body: { name: "Victor Hugo" } });
        expect(onProfileUpdated).toHaveBeenCalled();
        expect(result.current.editingName).toBe(false);
        expect(result.current.snackbarType).toBe("success");
    });

    it("saveName exibe a mensagem de erro da API quando falha", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(400, "Nome inválido"));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.setNameValue("Victor");
        });

        await act(async () => {
            await result.current.saveName();
        });

        expect(result.current.snackbarMsg).toBe("Nome inválido");
    });

    it("saveName ignora chamadas concorrentes enquanto uma já está em andamento", async () => {
        let resolveFetch!: () => void;
        mockApiFetchClient.mockReturnValue(new Promise(resolve => { resolveFetch = () => resolve(undefined); }));
        const { result } = renderHook(() => useProfile({}));

        act(() => {
            result.current.setNameValue("Victor");
        });

        act(() => {
            result.current.saveName();
        });
        await waitFor(() => expect(result.current.savingName).toBe(true));

        act(() => {
            result.current.saveName();
        });

        expect(mockApiFetchClient).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveFetch();
        });
    });
});
