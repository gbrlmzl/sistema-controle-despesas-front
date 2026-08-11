import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntrarResidenciaForm from "./EntrarResidenciaForm";
import entrarResidenciaAction from "./entrarResidenciaAction";

jest.mock("./entrarResidenciaAction");

const mockEntrarResidenciaAction = entrarResidenciaAction as jest.MockedFunction<typeof entrarResidenciaAction>;

function getSubmitButton() {
    return screen.getByRole("button", { name: "Enviar solicitação" });
}

beforeEach(() => {
    mockEntrarResidenciaAction.mockReset();
});

describe("EntrarResidenciaForm", () => {
    it("normaliza o código para maiúsculas, remove caracteres inválidos e limita a 6 caracteres", async () => {
        const user = userEvent.setup();
        render(<EntrarResidenciaForm />);

        const campoCodigo = screen.getByPlaceholderText("CÓDIGO");
        await user.type(campoCodigo, "ab12-cd!!extra");

        expect(campoCodigo).toHaveValue("AB12CD");
    });

    it("mantém o botão de envio desabilitado até o código ter 6 caracteres", async () => {
        const user = userEvent.setup();
        render(<EntrarResidenciaForm />);

        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("CÓDIGO"), "AB12C");
        expect(getSubmitButton()).toBeDisabled();

        await user.type(screen.getByPlaceholderText("CÓDIGO"), "D");
        expect(getSubmitButton()).toBeEnabled();
    });

    it("exibe a mensagem de sucesso devolvida pela action", async () => {
        mockEntrarResidenciaAction.mockResolvedValue({ success: true, message: "Solicitação enviada!" });
        const user = userEvent.setup();
        render(<EntrarResidenciaForm />);

        await user.type(screen.getByPlaceholderText("CÓDIGO"), "AB12CD");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Solicitação enviada!")).toBeInTheDocument();
    });

    it("exibe a mensagem de erro devolvida pela action", async () => {
        mockEntrarResidenciaAction.mockResolvedValue({ success: false, message: "Código inválido" });
        const user = userEvent.setup();
        render(<EntrarResidenciaForm />);

        await user.type(screen.getByPlaceholderText("CÓDIGO"), "AB12CD");
        await user.click(getSubmitButton());

        expect(await screen.findByText("Código inválido")).toBeInTheDocument();
    });
});
