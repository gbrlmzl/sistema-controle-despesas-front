import { act, renderHook, waitFor } from "@testing-library/react";
import { useLogout } from "./useLogout";
import { apiFetchClient } from "@/lib/apiClient.client";
import { useSetCurrentUser } from "@/components/providers/UserProvider";

jest.mock("@/lib/apiClient.client");
jest.mock("@/components/providers/UserProvider");

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;
const mockUseSetCurrentUser = useSetCurrentUser as jest.MockedFunction<typeof useSetCurrentUser>;
const mockSetUser = jest.fn();

beforeEach(() => {
    mockPush.mockClear();
    mockApiFetchClient.mockReset();
    mockSetUser.mockClear();
    mockUseSetCurrentUser.mockReturnValue(mockSetUser);
});

describe("useLogout", () => {
    it("começa com isLoggingOut false", () => {
        const { result } = renderHook(() => useLogout());
        expect(result.current.isLoggingOut).toBe(false);
    });

    it("chama /auth/logout, limpa o contexto e redireciona para o login ao suceder", async () => {
        mockApiFetchClient.mockResolvedValue(undefined);
        const { result } = renderHook(() => useLogout());

        await act(async () => {
            await result.current.logout();
        });

        expect(mockApiFetchClient).toHaveBeenCalledWith("/auth/logout", { method: "POST", skipAuthRetry: true });
        expect(mockSetUser).toHaveBeenCalledWith(null);
        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("redireciona para o login mesmo se a chamada à API falhar", async () => {
        mockApiFetchClient.mockRejectedValue(new Error("falha de rede"));
        const { result } = renderHook(() => useLogout());

        await act(async () => {
            await result.current.logout();
        });

        expect(mockSetUser).toHaveBeenCalledWith(null);
        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("marca isLoggingOut como true enquanto a chamada está em andamento", async () => {
        let resolveFetch!: () => void;
        mockApiFetchClient.mockReturnValue(new Promise(resolve => { resolveFetch = () => resolve(undefined); }));
        const { result } = renderHook(() => useLogout());

        act(() => {
            result.current.logout();
        });

        await waitFor(() => expect(result.current.isLoggingOut).toBe(true));

        await act(async () => {
            resolveFetch();
        });
    });
});
