'use client'

import { useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import { comprimirImagem } from "@/utils/comprimirImagem";
import { periodoAAAAMM } from "@/utils/competencia";

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

interface UploadTicket {
    receiptId: string;
    upload: { url: string; fields: Record<string, string> };
    expiresInSeconds: number;
}

export type EstadoAnexo = 'ocioso' | 'comprimindo' | 'enviando' | 'confirmando';

export interface ErroAnexo {
    mensagem: string;
    //Se o objeto já chegou no S3, o retry só pode refazer o passo 4 -- refazer o
    //3 duplicaria o objeto no bucket (C.4, armadilha nº4). null == ainda não
    //passou do passo 3, então "tentar de novo" reinicia o fluxo inteiro.
    receiptId: string | null;
}

//C.7 -> as duas únicas mensagens que o front escreve por conta própria, no
//lugar da mensagem crua da API -- 503 e 422 são exatamente os dois casos que o
//plano-fonte pede texto amigável específico. Qualquer outro status (ex.: os
//409 de "lado errado", que não deveriam ser alcançáveis pela interface) usa a
//mensagem que a API devolveu, como o resto do projeto sempre faz (F-08).
function mensagemDoErro(erro: unknown): string {
    if (erro instanceof ApiError) {
        if (erro.status === 503) {
            return 'O envio de comprovantes está indisponível no momento. Tente mais tarde.';
        }
        if (erro.status === 422) {
            return 'O arquivo enviado não pôde ser validado. Tente enviar novamente.';
        }
        return erro.message;
    }
    return 'Erro ao enviar o comprovante. Tente novamente mais tarde.';
}

interface IdentificadorAcerto {
    code: string;
    month: number;
    year: number;
    settlementId: string;
}

//F-14 -> roda inteiramente no client. NÃO é Server Action, apesar de outras
//mutações do repositório seguirem esse padrão: D-28 exige que o navegador fale
//direto com o S3 (passo 3), e um Server Action executaria no servidor Next,
//que é exatamente o que a arquitetura evita (o arquivo nunca deve passar pelo
//servidor do front, D-13/D-23).
export function useAnexarComprovante() {
    const [estado, setEstado] = useState<EstadoAnexo>('ocioso');
    const [erro, setErro] = useState<ErroAnexo | null>(null);

    //Passo 4 isolado -- reusado tanto pelo fluxo normal quanto pelo retry.
    async function completar(alvo: IdentificadorAcerto, receiptId: string): Promise<void> {
        const periodo = periodoAAAAMM({ month: alvo.month, year: alvo.year });
        await apiFetchClient(
            `/residences/${alvo.code}/closures/${periodo}/settlements/${alvo.settlementId}/receipts/${receiptId}/complete`,
            { method: 'POST' },
        );
    }

    //Devolve se deu certo -- o chamador (AnexarComprovanteInput) precisa saber
    //na hora, sem depender do estado reativo do hook: como anexar() é chamado
    //direto de um handler e é assíncrono, ler `erro`/`estado` do closure logo
    //após o await pegaria o valor de quando o handler foi criado, não o mais
    //recente (o clássico closure velho de hook). O retorno evita esse problema.
    async function anexar(alvo: IdentificadorAcerto, arquivoOriginal: File): Promise<boolean> {
        setErro(null);

        if (!TIPOS_ACEITOS.includes(arquivoOriginal.type)) {
            setErro({ mensagem: 'Formato não suportado. Envie JPEG, PNG, WebP ou PDF.', receiptId: null });
            return false;
        }
        if (arquivoOriginal.size > TAMANHO_MAXIMO_BYTES) {
            setErro({ mensagem: 'O comprovante deve ter no máximo 5 MB.', receiptId: null });
            return false;
        }

        // 1) comprimir (Fase 6) -- PDF passa direto
        setEstado('comprimindo');
        let arquivo: File;
        try {
            arquivo = await comprimirImagem(arquivoOriginal);
        } catch (erroCapturado) {
            setErro({ mensagem: mensagemDoErro(erroCapturado), receiptId: null });
            setEstado('ocioso');
            return false;
        }

        // 2) intenção -- apiFetchClient, mesma origem (C.4)
        setEstado('enviando');
        let receiptId: string;
        let upload: UploadTicket['upload'];
        try {
            const intencao = await apiFetchClient<UploadTicket>(
                `/residences/${alvo.code}/closures/${periodoAAAAMM({ month: alvo.month, year: alvo.year })}/settlements/${alvo.settlementId}/receipts`,
                { method: 'POST', body: { contentType: arquivo.type, sizeInBytes: arquivo.size, originalName: arquivo.name } },
            );
            receiptId = intencao.receiptId;
            upload = intencao.upload;
        } catch (erroCapturado) {
            setErro({ mensagem: mensagemDoErro(erroCapturado), receiptId: null });
            setEstado('ocioso');
            return false;
        }

        // 3) S3 direto -- fetch puro, `file` por ÚLTIMO no FormData, SEM
        //credentials (C.4): mandar cookie pra AWS não ajuda em nada e atrapalha o CORS.
        const form = new FormData();
        for (const [chave, valor] of Object.entries(upload.fields)) {
            form.append(chave, valor);
        }
        form.append('file', arquivo);

        try {
            const respostaS3 = await fetch(upload.url, { method: 'POST', body: form });
            if (!respostaS3.ok) {
                throw new Error('upload ao S3 falhou');
            }
        } catch {
            //Ainda não sabemos se o objeto chegou no bucket -- sem receiptId
            //"seguro" pra reusar, o retry tem que refazer o fluxo inteiro.
            setErro({ mensagem: 'Não foi possível enviar o arquivo. Verifique sua conexão.', receiptId: null });
            setEstado('ocioso');
            return false;
        }

        // 4) completar -- só aqui a linha liquida. O objeto já está no bucket:
        //uma falha agora não deve refazer o passo 3 (armadilha nº4 do C.4).
        setEstado('confirmando');
        try {
            await completar(alvo, receiptId);
            setEstado('ocioso');
            return true;
        } catch (erroCapturado) {
            setErro({ mensagem: mensagemDoErro(erroCapturado), receiptId });
            setEstado('ocioso');
            return false;
        }
    }

    async function tentarNovamente(alvo: IdentificadorAcerto): Promise<boolean> {
        if (!erro?.receiptId) {
            return false;
        }

        setEstado('confirmando');
        try {
            await completar(alvo, erro.receiptId);
            setErro(null);
            setEstado('ocioso');
            return true;
        } catch (erroCapturado) {
            setErro({ mensagem: mensagemDoErro(erroCapturado), receiptId: erro.receiptId });
            setEstado('ocioso');
            return false;
        }
    }

    return { estado, erro, anexar, tentarNovamente };
}
