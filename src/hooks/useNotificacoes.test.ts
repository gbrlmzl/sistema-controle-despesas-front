import { act, renderHook, waitFor } from "@testing-library/react";
import useNotificacoes from "./useNotificacoes";
import { apiFetchClient } from "@/lib/apiClient.client";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

interface NotificacaoFake {
    id: number;
    isRead: boolean;
}

function criarListagem(notifications: NotificacaoFake[] = [], unread = 0) {
    return { notifications, total: notifications.length, page: 1, totalPages: 1, unread };
}

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("useNotificacoes", () => {
    it("busca as notificações recentes ao montar e limita ao painel de 5", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem([{ id: 1, isRead: false }], 4));

        const { result } = renderHook(() => useNotificacoes());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?limit=5");
        expect(result.current.naoLidas).toBe(4);
        expect(result.current.notificacoes).toHaveLength(1);
    });

    it("mantém o último estado conhecido quando a busca falha", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("falha de rede"));

        const { result } = renderHook(() => useNotificacoes());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.notificacoes).toEqual([]);
        expect(result.current.naoLidas).toBe(0);
    });

    it("alternarPainel abre o painel, recarrega e marca as não lidas como lidas", async () => {
        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: false }], 1));
        const { result } = renderHook(() => useNotificacoes());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: false }], 1));
        mockApiFetchClient.mockResolvedValueOnce({ unread: 0 });

        await act(async () => {
            await result.current.alternarPainel();
        });

        expect(result.current.painelAberto).toBe(true);
        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications", { method: "PATCH", body: { ids: [1] } });
        expect(result.current.naoLidas).toBe(0);
    });

    it("alternarPainel não marca nada como lida quando não há não lidas", async () => {
        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        const { result } = renderHook(() => useNotificacoes());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        mockApiFetchClient.mockClear();

        await act(async () => {
            await result.current.alternarPainel();
        });

        expect(mockApiFetchClient).toHaveBeenCalledTimes(1);
        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?limit=5");
    });

    it("alternarPainel apenas fecha o painel sem buscar de novo quando já está aberto", async () => {
        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        const { result } = renderHook(() => useNotificacoes());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        await act(async () => {
            await result.current.alternarPainel();
        });
        expect(result.current.painelAberto).toBe(true);

        mockApiFetchClient.mockClear();

        await act(async () => {
            await result.current.alternarPainel();
        });

        expect(result.current.painelAberto).toBe(false);
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("não quebra quando marcar como lida falha", async () => {
        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: false }], 1));
        const { result } = renderHook(() => useNotificacoes());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: false }], 1));
        mockApiFetchClient.mockRejectedValueOnce(new Error("falha ao marcar"));

        await act(async () => {
            await result.current.alternarPainel();
        });

        expect(result.current.painelAberto).toBe(true);
    });

    it("fecharPainel fecha o painel diretamente", async () => {
        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        const { result } = renderHook(() => useNotificacoes());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce(criarListagem([{ id: 1, isRead: true }], 0));
        await act(async () => {
            await result.current.alternarPainel();
        });
        expect(result.current.painelAberto).toBe(true);

        act(() => {
            result.current.fecharPainel();
        });

        expect(result.current.painelAberto).toBe(false);
    });

    it("verifica novas notificações periodicamente enquanto a aba está visível", async () => {
        jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
        mockApiFetchClient.mockResolvedValue(criarListagem([], 0));

        renderHook(() => useNotificacoes());

        await act(async () => {
            await Promise.resolve();
        });
        expect(mockApiFetchClient).toHaveBeenCalledTimes(1);

        await act(async () => {
            jest.advanceTimersByTime(30000);
            await Promise.resolve();
        });

        expect(mockApiFetchClient).toHaveBeenCalledTimes(2);
    });

    it("não verifica novas notificações quando a aba está em segundo plano", async () => {
        jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        mockApiFetchClient.mockResolvedValue(criarListagem([], 0));

        renderHook(() => useNotificacoes());

        await act(async () => {
            await Promise.resolve();
        });
        mockApiFetchClient.mockClear();

        await act(async () => {
            jest.advanceTimersByTime(30000);
            await Promise.resolve();
        });

        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("recarrega ao voltar o foco para a aba e limpa listeners/intervalo ao desmontar", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem([], 0));
        const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

        const { unmount } = renderHook(() => useNotificacoes());
        await act(async () => {
            await Promise.resolve();
        });
        mockApiFetchClient.mockClear();

        await act(async () => {
            window.dispatchEvent(new Event("focus"));
        });

        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?limit=5");

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith("focus", expect.any(Function));
        removeEventListenerSpy.mockRestore();
    });
});
