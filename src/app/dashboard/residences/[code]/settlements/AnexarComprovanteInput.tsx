'use client'

import { useState } from "react";
import { useAnexarComprovante } from "./useAnexarComprovante";
import PreviaComprovanteModal from "./PreviaComprovanteModal";
import styles from "./AnexarComprovanteInput.module.css";

const TEXTO_ESTADO: Record<string, string> = {
    comprimindo: 'Preparando...',
    enviando: 'Enviando...',
    confirmando: 'Confirmando...',
};

interface AnexarComprovanteInputProps {
    code: string;
    month: number;
    year: number;
    settlementId: string;
    //Sinaliza o pai pra recarregar os dados do servidor (router.refresh()) --
    //este componente não sabe nada sobre a lista ao redor dele.
    onEnviado: () => void;
}

//C.4/F-14 -> os 4 passos do upload rodam no client (useAnexarComprovante). Este
//componente só traduz o estado do hook em UI: seletor de arquivo, progresso e
//erro com "tentar novamente" quando aplicável.
export default function AnexarComprovanteInput({ code, month, year, settlementId, onEnviado }: AnexarComprovanteInputProps) {
    const { estado, erro, anexar, tentarNovamente } = useAnexarComprovante();
    const [arquivoParaConfirmar, setArquivoParaConfirmar] = useState<File | null>(null);
    const alvo = { code, month, year, settlementId };
    const ocupado = estado !== 'ocioso';
    //Bloqueia escolher outro arquivo enquanto o modal de pré-visualização ainda
    //está aberto -- evita trocar o arquivo por baixo do diálogo já mostrado.
    const bloqueado = ocupado || arquivoParaConfirmar !== null;

    function selecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
        const arquivo = evento.target.files?.[0];
        //Limpa o valor já aqui, não só depois do envio -- sem isso, escolher o
        //MESMO arquivo de novo após cancelar ou um erro não dispara onChange (o
        //navegador não vê o value mudar).
        evento.target.value = '';
        if (!arquivo) {
            return;
        }

        //Só abre a pré-visualização aqui -- o upload em si (validação,
        //compressão e os passos contra a API/S3) só roda se o usuário confirmar
        //no modal, nunca no momento da escolha do arquivo.
        setArquivoParaConfirmar(arquivo);
    }

    async function confirmarEnvio() {
        if (!arquivoParaConfirmar) {
            return;
        }

        const sucesso = await anexar(alvo, arquivoParaConfirmar);
        setArquivoParaConfirmar(null);
        if (sucesso) {
            onEnviado();
        }
    }

    async function retentar() {
        const sucesso = await tentarNovamente(alvo);
        if (sucesso) {
            onEnviado();
        }
    }

    return (
        <div className={styles.container}>
            <label className={styles.botao} aria-disabled={bloqueado}>
                {ocupado ? TEXTO_ESTADO[estado] : 'Anexar comprovante'}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={selecionarArquivo} disabled={bloqueado} className={styles.inputOculto} />
            </label>

            {erro && (
                <div className={styles.erro}>
                    <span>{erro.mensagem}</span>
                    {/* C.4, armadilha nº4 -> se o passo 3 já terminou, "tentar de novo"
                        só refaz o passo 4 -- reenviar o passo 3 duplicaria o objeto no bucket. */}
                    {erro.receiptId && (
                        <button type="button" className={styles.botaoRetentar} onClick={retentar} disabled={ocupado}>
                            Tentar novamente
                        </button>
                    )}
                </div>
            )}

            {arquivoParaConfirmar && (
                <PreviaComprovanteModal arquivo={arquivoParaConfirmar} enviando={ocupado}
                    onConfirmar={confirmarEnvio} onCancelar={() => setArquivoParaConfirmar(null)} />
            )}
        </div>
    )
}
