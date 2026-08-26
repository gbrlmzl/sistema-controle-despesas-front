import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnexarComprovanteInput from "./AnexarComprovanteInput";
import { useAnexarComprovante } from "./useAnexarComprovante";

jest.mock("./useAnexarComprovante");

const mockUseAnexarComprovante = useAnexarComprovante as jest.MockedFunction<typeof useAnexarComprovante>;

const ALVO = { code: "AB12CD", month: 8, year: 2026, settlementId: "s1" };

function estadoPadrao(overrides: Partial<ReturnType<typeof useAnexarComprovante>> = {}): ReturnType<typeof useAnexarComprovante> {
    return {
        estado: "ocioso",
        erro: null,
        anexar: jest.fn().mockResolvedValue(true),
        tentarNovamente: jest.fn().mockResolvedValue(true),
        ...overrides,
    };
}

async function escolherArquivo(arquivo = new File(["x"], "comprovante.jpg", { type: "image/jpeg" })) {
    const user = userEvent.setup();
    const input = screen.getByLabelText("Anexar comprovante", { selector: "input" });
    await user.upload(input, arquivo);
    return arquivo;
}

//jsdom não implementa URL.createObjectURL -- PreviaComprovanteModal usa pra
//gerar a prévia local da imagem escolhida.
beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-preview");
    global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
    mockUseAnexarComprovante.mockReset();
});

describe("AnexarComprovanteInput -- pré-visualização antes do envio", () => {
    it("não chama anexar() só de escolher o arquivo -- abre o modal de pré-visualização primeiro", async () => {
        const anexar = jest.fn().mockResolvedValue(true);
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({ anexar }));
        render(<AnexarComprovanteInput {...ALVO} onEnviado={jest.fn()} />);

        await escolherArquivo();

        expect(screen.getByRole("dialog", { name: "Confirmar comprovante" })).toBeInTheDocument();
        expect(anexar).not.toHaveBeenCalled();
    });

    it("confirmar no modal chama anexar() com o arquivo escolhido e avisa o pai (onEnviado) em sucesso", async () => {
        const anexar = jest.fn().mockResolvedValue(true);
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({ anexar }));
        const onEnviado = jest.fn();
        const user = userEvent.setup();
        render(<AnexarComprovanteInput {...ALVO} onEnviado={onEnviado} />);

        const arquivo = await escolherArquivo();
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(anexar).toHaveBeenCalledWith(ALVO, arquivo);
        expect(onEnviado).toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("cancelar no modal fecha a pré-visualização sem chamar anexar()", async () => {
        const anexar = jest.fn().mockResolvedValue(true);
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({ anexar }));
        const user = userEvent.setup();
        render(<AnexarComprovanteInput {...ALVO} onEnviado={jest.fn()} />);

        await escolherArquivo();
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(anexar).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("não chama onEnviado quando anexar() falha", async () => {
        const anexar = jest.fn().mockResolvedValue(false);
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({ anexar }));
        const onEnviado = jest.fn();
        const user = userEvent.setup();
        render(<AnexarComprovanteInput {...ALVO} onEnviado={onEnviado} />);

        await escolherArquivo();
        await user.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(onEnviado).not.toHaveBeenCalled();
    });

    it("mostra o texto de progresso conforme o estado do hook, e desabilita o input", () => {
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({ estado: "enviando" }));
        render(<AnexarComprovanteInput {...ALVO} onEnviado={jest.fn()} />);

        expect(screen.getByText("Enviando...")).toBeInTheDocument();
        expect(screen.getByLabelText("Enviando...", { selector: "input" })).toBeDisabled();
    });

    it("mostra a mensagem de erro, sem botão de retry quando o passo 3 nunca terminou", () => {
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({
            erro: { mensagem: "Não foi possível enviar o arquivo. Verifique sua conexão.", receiptId: null },
        }));
        render(<AnexarComprovanteInput {...ALVO} onEnviado={jest.fn()} />);

        expect(screen.getByText("Não foi possível enviar o arquivo. Verifique sua conexão.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
    });

    it("mostra 'Tentar novamente' quando o erro guarda um receiptId, e chama tentarNovamente ao clicar", async () => {
        const tentarNovamente = jest.fn().mockResolvedValue(true);
        mockUseAnexarComprovante.mockReturnValue(estadoPadrao({
            erro: { mensagem: "O arquivo enviado não pôde ser validado. Tente enviar novamente.", receiptId: "r1" },
            tentarNovamente,
        }));
        const onEnviado = jest.fn();
        const user = userEvent.setup();
        render(<AnexarComprovanteInput {...ALVO} onEnviado={onEnviado} />);

        await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

        expect(tentarNovamente).toHaveBeenCalledWith(ALVO);
        expect(onEnviado).toHaveBeenCalled();
    });
});
