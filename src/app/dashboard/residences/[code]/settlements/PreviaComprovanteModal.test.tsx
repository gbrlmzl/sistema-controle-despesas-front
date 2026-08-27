import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreviaComprovanteModal from "./PreviaComprovanteModal";

beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-preview");
    global.URL.revokeObjectURL = jest.fn();
});

describe("PreviaComprovanteModal", () => {
    it("mostra a imagem escolhida via URL local (blob), sem chamar rede nenhuma", () => {
        const arquivo = new File(["x"], "comprovante.jpg", { type: "image/jpeg" });
        render(<PreviaComprovanteModal arquivo={arquivo} enviando={false} onConfirmar={jest.fn()} onCancelar={jest.fn()} />);

        const imagem = screen.getByRole("img");
        expect(imagem).toHaveAttribute("src", "blob:mock-preview");
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(arquivo);
    });

    it("mostra o nome do arquivo em vez de tentar exibir um PDF", () => {
        const arquivo = new File(["x"], "comprovante.pdf", { type: "application/pdf" });
        render(<PreviaComprovanteModal arquivo={arquivo} enviando={false} onConfirmar={jest.fn()} onCancelar={jest.fn()} />);

        expect(screen.getByText("comprovante.pdf")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("clicar em Confirmar chama onConfirmar, e em Cancelar chama onCancelar -- nenhum dos dois no outro", async () => {
        const user = userEvent.setup();
        const onConfirmar = jest.fn();
        const onCancelar = jest.fn();
        const arquivo = new File(["x"], "comprovante.jpg", { type: "image/jpeg" });
        render(<PreviaComprovanteModal arquivo={arquivo} enviando={false} onConfirmar={onConfirmar} onCancelar={onCancelar} />);

        await user.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(onConfirmar).toHaveBeenCalledTimes(1);
        expect(onCancelar).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Cancelar" }));
        expect(onCancelar).toHaveBeenCalledTimes(1);
        expect(onConfirmar).toHaveBeenCalledTimes(1);
    });

    it("desabilita os dois botões e mostra 'Enviando...' enquanto enviando=true", () => {
        const arquivo = new File(["x"], "comprovante.jpg", { type: "image/jpeg" });
        render(<PreviaComprovanteModal arquivo={arquivo} enviando={true} onConfirmar={jest.fn()} onCancelar={jest.fn()} />);

        expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    });
});
