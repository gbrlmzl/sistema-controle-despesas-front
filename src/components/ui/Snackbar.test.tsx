import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Snackbar from "./Snackbar";

describe("Snackbar", () => {
    it("não renderiza nada quando fechado", () => {
        const { container } = render(<Snackbar open={false} message="Oi" onClose={jest.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("exibe a mensagem quando aberto", () => {
        render(<Snackbar open={true} message="Despesa cadastrada" onClose={jest.fn()} />);
        expect(screen.getByText("Despesa cadastrada")).toBeInTheDocument();
    });

    it("chama onClose ao clicar no botão de fechar", async () => {
        const onClose = jest.fn();
        const user = userEvent.setup();
        render(<Snackbar open={true} message="Oi" onClose={onClose} />);

        await user.click(screen.getByAltText("Fechar"));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("permanece montado durante o fade-out e desmonta 300ms depois de fechar", () => {
        jest.useFakeTimers();

        const { rerender, container } = render(<Snackbar open={true} message="Oi" onClose={jest.fn()} />);
        rerender(<Snackbar open={false} message="Oi" onClose={jest.fn()} />);

        //Ainda montado: é o fade-out que precisa ser visto antes de sumir de vez
        expect(screen.getByText("Oi")).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(container).toBeEmptyDOMElement();

        jest.useRealTimers();
    });

    it("aplica uma cor de fundo diferente para cada tipo", () => {
        const { rerender } = render(<Snackbar open={true} message="Oi" onClose={jest.fn()} type="success" />);
        const corSucesso = (screen.getByText("Oi").parentElement as HTMLElement).style.backgroundColor;

        rerender(<Snackbar open={true} message="Oi" onClose={jest.fn()} type="error" />);
        const corErro = (screen.getByText("Oi").parentElement as HTMLElement).style.backgroundColor;

        expect(corSucesso).not.toBe("");
        expect(corSucesso).not.toBe(corErro);
    });
});
