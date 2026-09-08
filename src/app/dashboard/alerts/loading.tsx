import { AreaCarregando, Skeleton } from "@/components/ui/Skeleton";

/* Central de notificações. Espelha ListaAlertas: o botão "marcar todas como lidas"
   no topo e a lista de itens (título, mensagem e data, um sob o outro). */
export default function Carregando() {
    return (
        <div className="superficie">
            <AreaCarregando rotulo="Carregando suas notificações" style={{ width: "100%" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "0.75rem", marginBottom: "1.25rem",
                }}>
                    <Skeleton largura="9rem" altura="1.6rem" />
                    <Skeleton largura="11rem" altura="2.2rem" raio="var(--r-md)" />
                </div>

                <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%" }}>
                    {["68%", "54%", "72%", "48%"].map((largura, i) => (
                        <li key={i} style={{
                            display: "flex", flexDirection: "column", gap: "0.35rem",
                            padding: "0.85rem 1rem", borderRadius: "var(--r-lg)", background: "var(--surface-2)",
                        }}>
                            <Skeleton largura={largura} altura="0.95rem" />
                            <Skeleton largura="90%" altura="0.8rem" />
                            <Skeleton largura="6rem" altura="0.72rem" />
                        </li>
                    ))}
                </ul>
            </AreaCarregando>
        </div>
    );
}
