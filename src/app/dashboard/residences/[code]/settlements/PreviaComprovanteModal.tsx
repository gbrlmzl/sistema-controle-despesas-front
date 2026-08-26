'use client'

import { useEffect, useState } from "react";
import styles from "./PreviaComprovanteModal.module.css";

interface PreviaComprovanteModalProps {
    arquivo: File;
    enviando: boolean;
    onConfirmar: () => void;
    onCancelar: () => void;
}

//Confirmação visual antes do envio -- o arquivo só é comprimido/enviado (os 4
//passos de useAnexarComprovante) quando o usuário confirma aqui. A URL de
//pré-visualização é local (URL.createObjectURL do próprio File escolhido no
//dispositivo do usuário) -- nunca sai do navegador, então não tem nada a ver
//com a URL pré-assinada de leitura (D-25) que Comprovante.tsx busca depois.
export default function PreviaComprovanteModal({ arquivo, enviando, onConfirmar, onCancelar }: PreviaComprovanteModalProps) {
    const [previaUrl, setPreviaUrl] = useState<string | null>(null);
    const ehImagem = arquivo.type !== 'application/pdf';

    useEffect(() => {
        if (!ehImagem) {
            return;
        }

        const url = URL.createObjectURL(arquivo);
        setPreviaUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [arquivo, ehImagem]);

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloPreviaComprovante">
            <div className={styles.modal}>
                <h3 id="tituloPreviaComprovante">Confirmar comprovante</h3>

                {ehImagem && previaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL local (blob:) do arquivo escolhido, não é o domínio remoto que next/image exigiria configurar
                    <img src={previaUrl} alt={arquivo.name} className={styles.previa} />
                ) : (
                    <p className={styles.nomeArquivo}>{arquivo.name}</p>
                )}

                <p className={styles.aviso}>Confira se este é o comprovante certo antes de enviar.</p>

                <div className={styles.botoesContainer}>
                    <button type="button" className={styles.botaoCancelar} onClick={onCancelar} disabled={enviando}>
                        Cancelar
                    </button>
                    <button type="button" className={styles.botaoConfirmar} onClick={onConfirmar} disabled={enviando}>
                        {enviando ? 'Enviando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
