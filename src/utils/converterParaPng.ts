//Converte uma imagem rasterizada (JPEG/PNG/WebP) para PNG, sem redimensionar --
//ao contrário de comprimirImagem.ts (que resize+recomprime pra WebP ANTES do
//upload, pra poupar banda), aqui o objetivo é só trocar o formato do arquivo já
//armazenado no download, preservando a resolução original.
export async function converterParaPng(blob: Blob): Promise<Blob> {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(blob);
    } catch {
        throw new Error('Não foi possível processar esta imagem.');
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const contexto = canvas.getContext('2d');
        if (!contexto) {
            throw new Error('Não foi possível converter esta imagem.');
        }

        contexto.drawImage(bitmap, 0, 0);

        const resultado = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!resultado) {
            throw new Error('Não foi possível converter esta imagem.');
        }

        return resultado;
    } finally {
        bitmap.close();
    }
}
