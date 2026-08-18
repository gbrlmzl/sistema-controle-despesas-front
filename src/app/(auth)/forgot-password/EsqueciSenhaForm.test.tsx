import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EsqueciSenhaForm from "./EsqueciSenhaForm";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

jest.mock("@/lib/apiClient.client");

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

const mockApiFetchClient = apiFetchClient as jest.MockedFunction<typeof apiFetchClient>;

function getSubmitButton() {
    return screen.getByRole("button", { name: "Enviar link" });
}

beforeEach(() => {
    mockPush.mockClear();
    mockApiFetchClient.mockReset();
});

describe("EsqueciSenhaForm", () => {
    it("mantém o botão de envio desabilitado com o campo vazio", () => {
        render(<EsqueciSenhaForm />);
        expect(getSubmitButton()).toBeDisabled();
    });

    it("email em formato inválido não chama a API e mostra a mensagem de erro", async () => {
        const user = userEvent.setup();
        render(<EsqueciSenhaForm />);

        await user.type(screen.getByPlaceholderText("Email"), "não-é-email");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Email inválido")).toBeInTheDocument();
        expect(mockApiFetchClient).not.toHaveBeenCalled();
    });

    it("envia o email para a API e mostra a mensagem devolvida pela API, provando que o texto não está hardcoded", async () => {
        mockApiFetchClient.mockResolvedValue({ message: "Se este email existir, você receberá um link em instantes." });
        const user = userEvent.setup();
        render(<EsqueciSenhaForm />);

        await user.type(screen.getByPlaceholderText("Email"), "victor@example.com");
        await user.click(getSubmitButton());

        await waitFor(() => expect(mockApiFetchClient).toHaveBeenCalledWith("/auth/forgot-password", {
            method: "POST",
            skipAuthRetry: true,
            body: { email: "victor@example.com" },
        }));

        expect(await screen.findByText("Se este email existir, você receberá um link em instantes.")).toBeInTheDocument();
    });

    it("mostra a mensagem da API quando o limite de tentativas é excedido", async () => {
        mockApiFetchClient.mockRejectedValue(new ApiError(429, "Muitas tentativas. Tente novamente mais tarde."));
        const user = userEvent.setup();
        render(<EsqueciSenhaForm />);

        await user.type(screen.getByPlaceholderText("Email"), "victor@example.com");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Muitas tentativas. Tente novamente mais tarde.")).toBeInTheDocument();
    });

    it("o botão Reenviar começa desabilitado logo após o envio", async () => {
        mockApiFetchClient.mockResolvedValue({ message: "Se este email existir, você receberá um link em instantes." });
        const user = userEvent.setup();
        render(<EsqueciSenhaForm />);

        await user.type(screen.getByPlaceholderText("Email"), "victor@example.com");
        await user.click(getSubmitButton());

        expect(await screen.findByRole("button", { name: /Reenviar/ })).toBeDisabled();
    });
});
