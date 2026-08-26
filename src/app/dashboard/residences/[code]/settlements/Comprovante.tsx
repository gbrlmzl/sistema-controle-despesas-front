'use client'

import { useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import { periodoAAAAMM } from "@/utils/competencia";
import { converterParaPng } from "@/utils/converterParaPng";
import styles from "./Comprovante.module.css";

interface ComprovanteProps {
    code: string;
    month: number;
    year: number;
    receiptId: string;
    contentType: string;
    originalName: string | null;
}

interface UrlComprovante {
    url: string;
    expiresInSeconds: number;
}

type Estado = 'carregando' | 'pronto' | 'erro';

const EXTENSAO_POR_TIPO: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};

//originalName pode ser null (upload sem nome original, ou fechamento legado) --
//nesse caso monta um nome genérico a partir do content-type, só pra linha nunca
//ficar sem rótulo nenhum.
function nomeDeExibicao(originalName: string | null, contentType: string): string {
    return originalName || `comprovante.${EXTENSAO_POR_TIPO[contentType] ?? 'arquivo'}`;
}

function trocarExtensaoParaPng(nome: string): string {
    return `${nome.replace(/\.[^./]+$/, '')}.png`;
}

function IconeLupa() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}

function IconeDownload() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
        </svg>
    );
}

//C.5/D-25/F-15 -> a URL pré-assinada vale 5 minutos e nunca deve ficar em
//cache nem em estado de longa duração -- este componente busca a própria URL
//ao montar (nunca recebe pronta do Server Component da página) e a descarta
//ao desmontar. Qualquer membro pode ver (RN-080), não só quem está no par.
export default function Comprovante({ code, month, year, receiptId, contentType, originalName }: ComprovanteProps) {
    const [estado, setEstado] = useState<Estado>('carregando');
    const [url, setUrl] = useState<string | null>(null);
    const [ampliado, setAmpliado] = useState(false);
    const [baixando, setBaixando] = useState(false);
    const [erroDownload, setErroDownload] = useState(false);

    useEffect(() => {
        let cancelado = false;
        setEstado('carregando');

        const periodo = periodoAAAAMM({ month, year });
        apiFetchClient<UrlComprovante>(`/residences/${code}/closures/${periodo}/receipts/${receiptId}/url`)
            .then(resposta => {
                if (cancelado) {
                    return;
                }
                setUrl(resposta.url);
                setEstado('pronto');
            })
            .catch(() => {
                if (!cancelado) {
                    setEstado('erro');
                }
            });

        return () => { cancelado = true; };
    }, [code, month, year, receiptId]);

    if (estado === 'carregando') {
        return <span className={styles.placeholder}>Carregando comprovante...</span>;
    }

    if (estado === 'erro' || !url) {
        return <span className={styles.erro}>Não foi possível carregar este comprovante.</span>;
    }

    const nome = nomeDeExibicao(originalName, contentType);
    //PDF nunca é embutido (§A.2) -- a lupa abre numa aba nova em vez de ampliar
    //dentro de um modal, como acontece pras imagens.
    const ehImagem = contentType !== 'application/pdf';

    //A URL pré-assinada sai com Content-Disposition: inline (pra funcionar em
    //<img src>/na lupa) -- por isso um <a download> direto não basta pra
    //imagem: sem CORS de LEITURA liberado no bucket (só o upload tem, D-28), o
    //navegador ignora o atributo download num recurso cross-origin e só
    //navega/abre o arquivo. A saída é ler o arquivo via fetch (exige o bucket
    //liberar CORS pra GET) e baixar o blob resultante, que é sempre "mesma
    //origem" pro navegador. Aproveita esse mesmo passo pra converter pra PNG,
    //como pedido -- webp não abre em muita coisa por aí.
    async function baixar() {
        if (baixando) {
            return;
        }
        setBaixando(true);
        setErroDownload(false);
        try {
            const resposta = await fetch(url!);
            if (!resposta.ok) {
                throw new Error('download falhou');
            }
            const blobOriginal = await resposta.blob();
            const blobPng = await converterParaPng(blobOriginal);

            const objectUrl = URL.createObjectURL(blobPng);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = trocarExtensaoParaPng(nome);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch {
            setErroDownload(true);
        } finally {
            setBaixando(false);
        }
    }

    return (
        <>
            <div className={styles.linha}>
                <div className={styles.linhaTopo}>
                    <span className={styles.nomeArquivo} title={nome}>{nome}</span>

                    <div className={styles.acoes}>
                        {ehImagem ? (
                            <button type="button" className={styles.botaoIcone} onClick={() => setAmpliado(true)}
                                aria-label="Ampliar comprovante" title="Ampliar">
                                <IconeLupa />
                            </button>
                        ) : (
                            <a href={url} target="_blank" rel="noopener" className={styles.botaoIcone}
                                aria-label="Abrir comprovante" title="Abrir">
                                <IconeLupa />
                            </a>
                        )}

                        {ehImagem ? (
                            <button type="button" className={styles.botaoIcone} onClick={baixar} disabled={baixando}
                                aria-label="Baixar comprovante" title="Baixar como PNG">
                                <IconeDownload />
                            </button>
                        ) : (
                            //PDF já sai com Content-Disposition: attachment forçado pela
                            //API -- não depende de CORS de leitura nem precisa de
                            //conversão nenhuma, um link direto já baixa.
                            <a href={url} download={nome} target="_blank" rel="noopener" className={styles.botaoIcone}
                                aria-label="Baixar comprovante" title="Baixar">
                                <IconeDownload />
                            </a>
                        )}
                    </div>
                </div>

                {erroDownload && (
                    <span className={styles.erroDownload}>
                        Não foi possível baixar. Tente novamente.
                    </span>
                )}
            </div>

            {ampliado && ehImagem && (
                <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Comprovante ampliado: ${nome}`}
                    onClick={() => setAmpliado(false)}>
                    <div className={styles.modal} onClick={evento => evento.stopPropagation()}>
                        <button type="button" className={styles.fechar} onClick={() => setAmpliado(false)} aria-label="Fechar">
                            ×
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada e temporária, next/image exigiria configurar o domínio do bucket */}
                        <img src={url} alt={nome} className={styles.imagemAmpliada} />
                    </div>
                </div>
            )}
        </>
    );
}
