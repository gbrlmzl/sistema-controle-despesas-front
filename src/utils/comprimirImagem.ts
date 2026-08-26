//D-19/F-16 -> compressão e normalização da imagem ANTES de qualquer requisição
//(comprime no navegador, nunca no servidor -- a API não vê o arquivo original,
//D-13). Peça genuinamente nova: não há precedente no código para reaproveitar
//(resumoImagem.ts desenha e rasteriza um SVG próprio, não recomprime um
//arquivo que o usuário enviou).
const LADO_MAXIMO = 1600;
const QUALIDADE_WEBP = 0.82;

//Função pura, testável sem navegador: nunca amplia (escala <= 1), só reduz o
//lado maior até LADO_MAXIMO, mantendo a proporção.
export function calcularDimensoes(largura: number, altura: number, ladoMaximo: number = LADO_MAXIMO): { largura: number; altura: number } {
    const escala = Math.min(1, ladoMaximo / Math.max(largura, altura));
    return {
        largura: Math.round(largura * escala),
        altura: Math.round(altura * escala),
    };
}

function trocarExtensao(nomeOriginal: string, novaExtensao: string): string {
    return nomeOriginal.replace(/\.[^.]+$/, '') + novaExtensao;
}

//Comprime e normaliza para WebP, lado maior ~1600px (D-19). PDF passa direto --
//não faz sentido "comprimir" um PDF com canvas, e RN-081 já limita os tipos aceitos.
export async function comprimirImagem(arquivo: File): Promise<File> {
    if (arquivo.type === 'application/pdf') {
        return arquivo;
    }

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(arquivo);
    } catch {
        throw new Error('Não foi possível processar esta imagem. Tente outro arquivo.');
    }

    try {
        const { largura, altura } = calcularDimensoes(bitmap.width, bitmap.height);

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;

        const contexto = canvas.getContext('2d');
        if (!contexto) {
            throw new Error('Não foi possível preparar a imagem para envio.');
        }

        //Redesenhar no canvas descarta o EXIF por construção -- inclusive o GPS
        //(D-19). Não é uma remoção explícita: é consequência de rasterizar de novo.
        contexto.drawImage(bitmap, 0, 0, largura, altura);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', QUALIDADE_WEBP));
        if (!blob) {
            throw new Error('Não foi possível comprimir a imagem.');
        }

        return new File([blob], trocarExtensao(arquivo.name, '.webp'), { type: 'image/webp' });
    } finally {
        bitmap.close();
    }
}
