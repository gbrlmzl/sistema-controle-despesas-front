import { act, renderHook, waitFor } from "@testing-library/react";
import useAlertas from "./useAlertas";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function criarListagem(overrides: Partial<{ notifications: unknown[]; total: number; page: number; totalPages: number; unread: number }> = {}) {
    return {
        notifications: [],
        total: 0,
        page: 1,
        totalPages: 1,
        unread: 0,
        ...overrides,
    };
}

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

describe("useAlertas", () => {
    it("busca a primeira página de notificações ao montar", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem({ unread: 3, totalPages: 2 }));

        const { result } = renderHook(() => useAlertas());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?page=1");
        expect(result.current.naoLidas).toBe(3);
        expect(result.current.totalPaginas).toBe(2);
        expect(result.current.erro).toBeNull();
    });

    it("expõe a mensagem de um ApiError quando a busca falha", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(500, "Erro ao buscar notificações do servidor"));

        const { result } = renderHook(() => useAlertas());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.erro).toBe("Erro ao buscar notificações do servidor");
    });

    it("usa mensagem genérica quando a busca falha com erro não-ApiError", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("timeout"));

        const { result } = renderHook(() => useAlertas());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.erro).toBe("Erro ao buscar notificações");
    });

    it("irParaPagina troca a página e busca novamente", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem({ totalPages: 3 }));
        const { result } = renderHook(() => useAlertas());
        await waitFor(() => expect(result.current.loading).toBe(false));
        mockApiFetchClient.mockClear();

        act(() => {
            result.current.irParaPagina(2);
        });

        await waitFor(() => expect(result.current.pagina).toBe(2));
        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?page=2");
    });

    it("irParaPagina ignora páginas fora do intervalo válido", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem({ totalPages: 3 }));
        const { result } = renderHook(() => useAlertas());
        await waitFor(() => expect(result.current.loading).toBe(false));
        mockApiFetchClient.mockClear();

        act(() => {
            result.current.irParaPagina(0);
        });
        act(() => {
            result.current.irParaPagina(4);
        });

        expect(result.current.pagina).toBe(1);
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("marcarTodasComoLidas faz PATCH com all:true e recarrega a página atual", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem({ unread: 5 }));
        const { result } = renderHook(() => useAlertas());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockResolvedValueOnce({ unread: 0 });
        mockApiFetchClient.mockResolvedValueOnce(criarListagem({ unread: 0 }));

        await act(async () => {
            await result.current.marcarTodasComoLidas();
        });

        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications", { method: "PATCH", body: { all: true } });
        expect(mockApiFetchClient).toHaveBeenCalledWith("/notifications?page=1");
    });

    it("marcarTodasComoLidas expõe a mensagem de erro quando a atualização falha", async () => {
        mockApiFetchClient.mockResolvedValue(criarListagem());
        const { result } = renderHook(() => useAlertas());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockApiFetchClient.mockRejectedValueOnce(new ApiError(500, "Erro ao marcar notificações"));

        await act(async () => {
            await result.current.marcarTodasComoLidas();
        });

        expect(result.current.erro).toBe("Erro ao marcar notificações");
    });
});
