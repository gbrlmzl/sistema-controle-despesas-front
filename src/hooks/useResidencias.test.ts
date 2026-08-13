import { act, renderHook, waitFor } from "@testing-library/react";
import useResidencias from "./useResidencias";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function criarResposta(overrides: Partial<{ residences: unknown[]; receivedInvites: unknown[]; sentJoinRequests: unknown[] }> = {}) {
    return {
        residences: [],
        receivedInvites: [],
        sentJoinRequests: [],
        ...overrides,
    };
}

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("useResidencias", () => {
    it("busca residências, convites e solicitações ao montar", async () => {
        const residencia = { name: "Casa", code: "ABC123", ownerName: "Victor", isOwner: true, isArchived: false };
        mockApiFetchClient.mockResolvedValue(criarResposta({ residences: [residencia] }));

        const { result } = renderHook(() => useResidencias());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockApiFetchClient).toHaveBeenCalledWith("/residences");
        expect(result.current.residencias).toEqual([residencia]);
        expect(result.current.erro).toBeNull();
    });

    it("expõe a mensagem de um ApiError quando a busca falha", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(500, "Erro ao buscar residências do servidor"));

        const { result } = renderHook(() => useResidencias());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.erro).toBe("Erro ao buscar residências do servidor");
    });

    it("usa mensagem genérica quando a busca falha com erro não-ApiError", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("timeout"));

        const { result } = renderHook(() => useResidencias());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.erro).toBe("Erro ao buscar residências");
    });

    it("recarregar refaz a busca e limpa o erro anterior em caso de sucesso", async () => {
        mockApiFetchClient.mockRejectedValueOnce(new Error("timeout"));
        const { result } = renderHook(() => useResidencias());
        await waitFor(() => expect(result.current.erro).toBe("Erro ao buscar residências"));

        mockApiFetchClient.mockResolvedValueOnce(criarResposta());

        await act(async () => {
            await result.current.recarregar();
        });

        expect(result.current.erro).toBeNull();
    });

    it("copiarCodigo usa o clipboard e mostra uma snackbar de sucesso que some após o tempo definido", async () => {
        jest.useFakeTimers();
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        mockApiFetchClient.mockResolvedValue(criarResposta());

        const { result } = renderHook(() => useResidencias());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.copiarCodigo("ABC123");
        });

        expect(writeText).toHaveBeenCalledWith("ABC123");
        expect(result.current.snackbar).toEqual({ open: true, message: "Código copiado!", type: "success" });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(result.current.snackbar.open).toBe(false);
    });

    it("copiarCodigo cai no fallback manual quando o clipboard nega o acesso", async () => {
        const writeText = jest.fn().mockRejectedValue(new Error("Permissão negada"));
        Object.assign(navigator, { clipboard: { writeText } });
        mockApiFetchClient.mockResolvedValue(criarResposta());

        const { result } = renderHook(() => useResidencias());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.copiarCodigo("XYZ789");
        });

        expect(result.current.snackbar).toEqual({
            open: true,
            message: "Copie o código manualmente: XYZ789",
            type: "warning",
        });
    });

    it("mostrarSnackbar sem tempo definido não fecha sozinha", async () => {
        mockApiFetchClient.mockResolvedValue(criarResposta());
        const { result } = renderHook(() => useResidencias());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.mostrarSnackbar({ msg: "Aviso", type: "info" });
        });

        expect(result.current.snackbar).toEqual({ open: true, message: "Aviso", type: "info" });
    });

    it("fecharSnackbar fecha a snackbar manualmente", async () => {
        mockApiFetchClient.mockResolvedValue(criarResposta());
        const { result } = renderHook(() => useResidencias());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.mostrarSnackbar({ msg: "Aviso", type: "info" });
        });

        act(() => {
            result.current.fecharSnackbar();
        });

        expect(result.current.snackbar).toEqual({ open: false, message: "", type: "" });
    });
});
