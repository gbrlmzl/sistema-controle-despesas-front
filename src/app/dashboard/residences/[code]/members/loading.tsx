import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";
import { CabecalhoCarregando, ListaCartoesCarregando } from "@/components/ui/SkeletonPagina";

/* Membros. A tela é leve (uma chamada só, GET /residences/:code), mas ela é
   justamente a origem da navegação mais reclamada — members → settlements — então
   ter o skeleton aqui importa tanto quanto na de destino.

   O `.superficie` vem de app/dashboard/app.css e é o mesmo wrapper da page.tsx:
   sem ele, o skeleton apareceria sem o cartão de fundo e a troca daria um salto. */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando os membros da residência"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

                {/* comAcao: o owner vê o atalho de solicitações no canto direito.
                    Reservar o espaço evita que o título se desloque quando ele aparece. */}
                <CabecalhoCarregando largura="7rem" comAcao />

                {/* .nomeResidencia — 1rem, centralizado, em ink-3 */}
                <Skeleton largura="9rem" altura="1rem" />

                <div style={{ width: "100%", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {/* .cabecalhoLista: h3 "Membros" + botão de convidar (2rem, redondo) */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                        <Skeleton largura="5.5rem" altura="1.1rem" />
                        <Skeleton largura="2rem" altura="2rem" circulo />
                    </div>

                    {/* Três é o tamanho típico de uma república; um skeleton mais alto
                        que a lista real faria a página encolher quando os dados chegam. */}
                    <ListaCartoesCarregando linhas={3} />
                </div>
            </AreaCarregando>
        </div>
    );
}
