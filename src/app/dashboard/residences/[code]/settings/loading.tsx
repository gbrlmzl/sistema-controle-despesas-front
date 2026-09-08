import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando } from "@/components/ui/SkeletonPagina";

/* Configurações da residência. Espelha ConfiguracoesResidencia: cabeçalho, nome da
   residência centralizado e a pilha de opções.

   A quantidade de opções depende do papel — o owner vê renomear, regenerar código e
   arquivar; o membro comum vê só "ver membros" e "sair". O skeleton mostra o caso do
   MEMBRO (o menor): errar para menos faz a lista crescer, o que é menos incômodo do
   que uma lista que encolhe e puxa o conteúdo para cima. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando as configurações da residência"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

                <CabecalhoCarregando largura="9rem" />

                <div style={{ marginTop: "0.5rem" }}>
                    <Skeleton largura="9rem" altura="1rem" />
                </div>

                <div style={{ width: "100%", marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <Skeleton largura="100%" altura="3.1rem" raio="var(--r-md)" />
                    <Skeleton largura="100%" altura="3.1rem" raio="var(--r-md)" />
                </div>
            </AreaCarregando>
        </div>
    );
}
