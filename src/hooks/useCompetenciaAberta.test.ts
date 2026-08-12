import { act, renderHook, waitFor } from "@testing-library/react";
import { useCompetenciaAberta } from "./useCompetenciaAberta";
import { apiFetchClient } from "@/lib/apiClient.client";
import type { Competencia } from "@/types/competencia";

jest.mock("@/lib/apiClient.client");

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function criarCompetencia(mes: number): Competencia {
    return { month: mes, year: 2026 };
}

function criarDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    mockApiFetchClient.mockReset();
});

describe("useCompetenciaAberta", () => {
    it("não busca nada quando o código é null", () => {
        const { result } = renderHook(() => useCompetenciaAberta(null));

        expect(result.current.competencia).toBeNull();
        expect(result.current.carregando).toBe(false);
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("busca a competência aberta da residência quando o código é informado", async () => {
        const competencia = criarCompetencia(8);
        mockApiFetchClient.mockResolvedValue({ competency: competencia });

        const { result } = renderHook(() => useCompetenciaAberta("ABC123"));

        expect(result.current.carregando).toBe(true);

        await waitFor(() => expect(result.current.carregando).toBe(false));

        expect(mockApiFetchClient).toHaveBeenCalledWith("/residences/ABC123/expenses");
        expect(result.current.competencia).toEqual(competencia);
    });

    it("limpa a competência quando a busca falha", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("falha de rede"));

        const { result } = renderHook(() => useCompetenciaAberta("ABC123"));

        await waitFor(() => expect(result.current.carregando).toBe(false));

        expect(result.current.competencia).toBeNull();
    });

    it("volta para null quando o código passa a ser null", async () => {
        mockApiFetchClient.mockResolvedValue({ competency: criarCompetencia(8) });

        const { result, rerender } = renderHook(({ codigo }) => useCompetenciaAberta(codigo), {
            initialProps: { codigo: "ABC123" as string | null },
        });

        await waitFor(() => expect(result.current.competencia).not.toBeNull());

        rerender({ codigo: null });

        expect(result.current.competencia).toBeNull();
        expect(result.current.carregando).toBe(false);
    });

    it("ignora uma resposta tardia de uma competência anterior quando o código muda antes dela chegar", async () => {
        const deferredA = criarDeferred<{ competency: Competencia }>();
        const deferredB = criarDeferred<{ competency: Competencia }>();
        mockApiFetchClient.mockReturnValueOnce(deferredA.promise).mockReturnValueOnce(deferredB.promise);

        const { result, rerender } = renderHook(({ codigo }) => useCompetenciaAberta(codigo), {
            initialProps: { codigo: "A" },
        });

        rerender({ codigo: "B" });

        const competenciaB = criarCompetencia(9);
        await act(async () => {
            deferredB.resolve({ competency: competenciaB });
            await deferredB.promise;
        });
        await waitFor(() => expect(result.current.competencia).toEqual(competenciaB));

        await act(async () => {
            deferredA.resolve({ competency: criarCompetencia(1) });
            await deferredA.promise;
        });

        expect(result.current.competencia).toEqual(competenciaB);
    });
});
