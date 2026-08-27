import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DispensarAcertoModal from "./DispensarAcertoModal";
import dispensarAcertoAction from "./dispensarAcertoAction";
import type { Acerto } from "@/types/acerto";

//Mesma armadilha do CadastrarDespesaModal.test.tsx: a action real importa
//next/cache, que usa TextEncoder (indisponível no jsdom dos testes).
jest.mock("./dispensarAcertoAction", () => jest.fn());

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), refresh: mockRefresh }),
}));

const mockDispensarAcertoAction = dispensarAcertoAction as jest.MockedFunction<typeof dispensarAcertoAction>;

const ACERTO: Pick<Acerto, "id" | "payer" | "receiver" | "amountInCents"> = {
    id: "s1",
    payer: { userId: 7, name: "Letícia Rocha" },
    receiver: { userId: 3, name: "Gabriel Mizael" },
    amountInCents: 21910,
};

function getBotaoDispensar() {
    return screen.getByRole("button", { name: "Dispensar" });
}

beforeEach(() => {
    mockDispensarAcertoAction.mockReset();
    mockRefresh.mockReset();
});

describe("DispensarAcertoModal", () => {
    it("mostra o par e o valor do acerto", () => {
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={jest.fn()} />);

        expect(screen.getByText(/Letícia Rocha → Gabriel Mizael/)).toBeInTheDocument();
        expect(screen.getByText(/R\$ 219,10/)).toBeInTheDocument();
    });

    it("chama onFechar ao clicar em cancelar, sem chamar a action", async () => {
        const onFechar = jest.fn();
        const user = userEvent.setup();
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={onFechar} />);

        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(onFechar).toHaveBeenCalled();
        expect(mockDispensarAcertoAction).not.toHaveBeenCalled();
    });

    it("mantém o botão desabilitado com o motivo vazio ou curto demais (RN-082 exige ao menos 3 caracteres)", async () => {
        const user = userEvent.setup();
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={jest.fn()} />);

        expect(getBotaoDispensar()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("Explique o motivo da dispensa"), "ok");
        expect(getBotaoDispensar()).toBeDisabled();
    });

    it("habilita o botão a partir de 3 caracteres, e mostra o contador", async () => {
        const user = userEvent.setup();
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={jest.fn()} />);

        await user.type(screen.getByPlaceholderText("Explique o motivo da dispensa"), "Morador saiu");

        expect(getBotaoDispensar()).toBeEnabled();
        expect(screen.getByText("12/200")).toBeInTheDocument();
    });

    it("em sucesso, atualiza a tela e fecha o modal", async () => {
        mockDispensarAcertoAction.mockResolvedValue({ success: true, message: "Acerto dispensado." });
        const onFechar = jest.fn();
        const user = userEvent.setup();
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={onFechar} />);

        await user.type(screen.getByPlaceholderText("Explique o motivo da dispensa"), "Morador saiu da casa");
        await user.click(getBotaoDispensar());

        await waitFor(() => expect(onFechar).toHaveBeenCalled());
        expect(mockRefresh).toHaveBeenCalled();
    });

    it("em erro, mostra a mensagem da API e mantém o modal aberto", async () => {
        mockDispensarAcertoAction.mockResolvedValue({ success: false, message: "Só o proprietário pode dispensar um acerto" });
        const onFechar = jest.fn();
        const user = userEvent.setup();
        render(<DispensarAcertoModal code="AB12CD" month={8} year={2026} acerto={ACERTO} onFechar={onFechar} />);

        await user.type(screen.getByPlaceholderText("Explique o motivo da dispensa"), "Morador saiu da casa");
        await user.click(getBotaoDispensar());

        expect(await screen.findByText("Só o proprietário pode dispensar um acerto")).toBeInTheDocument();
        expect(onFechar).not.toHaveBeenCalled();
    });
});
