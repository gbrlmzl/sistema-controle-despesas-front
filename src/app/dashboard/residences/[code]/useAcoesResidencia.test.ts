import { act, renderHook, waitFor } from "@testing-library/react";
import useAcoesResidencia from "./useAcoesResidencia";
import sairDaResidenciaAction from "./sairDaResidenciaAction";
import removerMembroAction from "./removerMembroAction";
import transferirPropriedadeAction from "./transferirPropriedadeAction";
import arquivarResidenciaAction from "./arquivarResidenciaAction";
import responderSolicitacaoAction from "./responderSolicitacaoAction";
import cancelarConviteAction from "./cancelarConviteAction";
import regenerarCodigoAction from "./regenerarCodigoAction";
import type { MembroResidencia, SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

jest.mock("./sairDaResidenciaAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./removerMembroAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./transferirPropriedadeAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./arquivarResidenciaAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./responderSolicitacaoAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./cancelarConviteAction", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("./regenerarCodigoAction", () => ({ __esModule: true, default: jest.fn() }));

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSairDaResidencia = sairDaResidenciaAction as jest.MockedFunction<typeof sairDaResidenciaAction>;
const mockRemoverMembro = removerMembroAction as jest.MockedFunction<typeof removerMembroAction>;
const mockTransferirPropriedade = transferirPropriedadeAction as jest.MockedFunction<typeof transferirPropriedadeAction>;
const mockArquivarResidencia = arquivarResidenciaAction as jest.MockedFunction<typeof arquivarResidenciaAction>;
const mockResponderSolicitacao = responderSolicitacaoAction as jest.MockedFunction<typeof responderSolicitacaoAction>;
const mockCancelarConvite = cancelarConviteAction as jest.MockedFunction<typeof cancelarConviteAction>;
const mockRegenerarCodigo = regenerarCodigoAction as jest.MockedFunction<typeof regenerarCodigoAction>;

const residencia = { code: "ABC123", name: "Casa da Praia", isArchived: false };

const membro: MembroResidencia = {
    userId: 7,
    name: "Ana",
    username: "ana",
    isOwner: false,
    isCurrentUser: false,
};

const solicitacao: SolicitacaoPendente = {
    id: 1,
    requesterName: "Bruno",
    requesterUsername: "bruno",
    createdAt: "2026-01-01T00:00:00.000Z",
};

const convite: ConviteEnviado = {
    id: 2,
    invitedUserName: "Carla",
    invitedUserUsername: "carla",
    createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockSairDaResidencia.mockReset();
    mockRemoverMembro.mockReset();
    mockTransferirPropriedade.mockReset();
    mockArquivarResidencia.mockReset();
    mockResponderSolicitacao.mockReset();
    mockCancelarConvite.mockReset();
    mockRegenerarCodigo.mockReset();
});

afterEach(() => {
    jest.useRealTimers();
});

describe("useAcoesResidencia", () => {
    it("começa com os estados de UI fechados", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        expect(result.current.confirmacao).toBeNull();
        expect(result.current.processando).toBe(false);
        expect(result.current.renomeando).toBe(false);
        expect(result.current.convidando).toBe(false);
        expect(result.current.snackbar).toEqual({ open: false, message: "", type: "" });
    });

    it("abre o convite já aberto quando abrirConviteInicial é true (CA-1 da US-007)", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia, true));

        expect(result.current.convidando).toBe(true);
    });

    it("abrirRenomear e fecharRenomear alternam o estado de renomeando", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.abrirRenomear());
        expect(result.current.renomeando).toBe(true);

        act(() => result.current.fecharRenomear());
        expect(result.current.renomeando).toBe(false);
    });

    it("abrirConvidar e fecharConvidar alternam o estado de convidando", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.abrirConvidar());
        expect(result.current.convidando).toBe(true);

        act(() => result.current.fecharConvidar());
        expect(result.current.convidando).toBe(false);
    });

    it("confirmarSaida monta a confirmação com o nome da residência", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarSaida());

        expect(result.current.confirmacao).toMatchObject({
            titulo: "Sair da residência",
            textoConfirmar: "Sair",
        });
        expect(result.current.confirmacao?.mensagem).toContain("Casa da Praia");
    });

    it("onConfirmar de confirmarSaida chama a action e redireciona para a lista de residências", async () => {
        mockSairDaResidencia.mockResolvedValue({ success: true, message: "Você saiu da residência." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarSaida());
        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockSairDaResidencia).toHaveBeenCalledWith("ABC123");
        expect(mockPush).toHaveBeenCalledWith("/dashboard/residences");
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(result.current.confirmacao).toBeNull();
    });

    it("confirmarRemocao inclui o nome do membro na mensagem e chama a action com o userId", async () => {
        mockRemoverMembro.mockResolvedValue({ success: true, message: "Membro removido da residência." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRemocao(membro));
        expect(result.current.confirmacao?.mensagem).toContain("Ana");

        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockRemoverMembro).toHaveBeenCalledWith("ABC123", 7);
        expect(mockRefresh).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("confirmarTransferencia inclui o nome do novo dono e chama a action com o userId", async () => {
        mockTransferirPropriedade.mockResolvedValue({ success: true, message: "Propriedade da residência transferida." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarTransferencia(membro));
        expect(result.current.confirmacao?.mensagem).toContain("Ana");

        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockTransferirPropriedade).toHaveBeenCalledWith("ABC123", 7);
    });

    it("confirmarArquivamento propõe arquivar quando a residência está ativa", async () => {
        mockArquivarResidencia.mockResolvedValue({ success: true, message: "Residência arquivada." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarArquivamento());

        expect(result.current.confirmacao).toMatchObject({
            titulo: "Arquivar residência",
            textoConfirmar: "Arquivar",
        });

        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockArquivarResidencia).toHaveBeenCalledWith("ABC123", true);
    });

    it("confirmarArquivamento propõe desarquivar quando a residência já está arquivada", async () => {
        mockArquivarResidencia.mockResolvedValue({ success: true, message: "Residência desarquivada." });
        const residenciaArquivada = { ...residencia, isArchived: true };
        const { result } = renderHook(() => useAcoesResidencia(residenciaArquivada));

        act(() => result.current.confirmarArquivamento());

        expect(result.current.confirmacao).toMatchObject({
            titulo: "Desarquivar residência",
            textoConfirmar: "Desarquivar",
        });

        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockArquivarResidencia).toHaveBeenCalledWith("ABC123", false);
    });

    it("confirmarRegeneracao chama a action e redireciona para a nova URL com o código novo", async () => {
        mockRegenerarCodigo.mockResolvedValue({ success: true, message: "Novo código gerado!", data: { code: "XYZ999" } });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRegeneracao());

        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(mockRegenerarCodigo).toHaveBeenCalledWith("ABC123");
        expect(mockPush).toHaveBeenCalledWith("/dashboard/residences/XYZ999/settings");
    });

    it("responderSolicitacao executa a action direto, sem passar por confirmacao", async () => {
        mockResponderSolicitacao.mockResolvedValue({ success: true, message: "Bruno agora é membro da residência." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        await act(async () => {
            result.current.responderSolicitacao(solicitacao, true);
        });

        expect(mockResponderSolicitacao).toHaveBeenCalledWith("ABC123", 1, true);
        expect(result.current.confirmacao).toBeNull();
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("cancelarConvite executa a action direto, sem passar por confirmacao", async () => {
        mockCancelarConvite.mockResolvedValue({ success: true, message: "Convite para Carla cancelado." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        await act(async () => {
            result.current.cancelarConvite(convite);
        });

        expect(mockCancelarConvite).toHaveBeenCalledWith("ABC123", 2);
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("marca processando como true enquanto a action está em andamento", async () => {
        let resolveAcao!: (value: { success: true; message: string }) => void;
        mockSairDaResidencia.mockReturnValue(new Promise(resolve => { resolveAcao = resolve; }));
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarSaida());

        act(() => {
            result.current.confirmacao!.onConfirmar();
        });

        await waitFor(() => expect(result.current.processando).toBe(true));

        await act(async () => {
            resolveAcao({ success: true, message: "Você saiu da residência." });
        });

        expect(result.current.processando).toBe(false);
    });

    it("mostra snackbar de sucesso com a mensagem da action e some após 3s", async () => {
        jest.useFakeTimers();
        mockRemoverMembro.mockResolvedValue({ success: true, message: "Membro removido da residência." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRemocao(membro));
        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(result.current.snackbar).toEqual({ open: true, message: "Membro removido da residência.", type: "success" });

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(result.current.snackbar.open).toBe(false);
    });

    it("mostra snackbar de erro com a mensagem da action e some após 4s quando a action falha", async () => {
        jest.useFakeTimers();
        mockRemoverMembro.mockResolvedValue({ success: false, message: "Só o dono pode remover membros." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRemocao(membro));
        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(result.current.snackbar).toEqual({ open: true, message: "Só o dono pode remover membros.", type: "error" });
        expect(result.current.confirmacao).toBeNull();

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        expect(result.current.snackbar.open).toBe(false);
    });

    it("usa mensagem genérica de erro quando a action falha sem message", async () => {
        mockRemoverMembro.mockResolvedValue({ success: false, message: "" });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRemocao(membro));
        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        expect(result.current.snackbar.message).toBe("Não foi possível concluir a ação");
    });

    it("fecharConfirmacao limpa a confirmação pendente", () => {
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarSaida());
        expect(result.current.confirmacao).not.toBeNull();

        act(() => result.current.fecharConfirmacao());
        expect(result.current.confirmacao).toBeNull();
    });

    it("fecharSnackbar fecha a snackbar manualmente", async () => {
        mockRemoverMembro.mockResolvedValue({ success: true, message: "Membro removido da residência." });
        const { result } = renderHook(() => useAcoesResidencia(residencia));

        act(() => result.current.confirmarRemocao(membro));
        await act(async () => {
            await result.current.confirmacao!.onConfirmar();
        });

        act(() => result.current.fecharSnackbar());

        expect(result.current.snackbar).toEqual({ open: false, message: "", type: "" });
    });
});
