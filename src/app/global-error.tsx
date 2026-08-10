"use client";

import { useEffect } from "react";

//Única rede de segurança para uma falha no layout raiz (src/app/layout.tsx) — hoje
//isso só aconteceria por um bug inesperado, já que getCurrentUser() (a chamada de
//rede que o layout faz em toda página) trata falha de API/rede caindo pra "deslogado"
//em vez de lançar. Precisa renderizar <html>/<body> própria porque substitui o
//layout raiz inteiro quando ativa — por isso não importa nada do resto do app
//(fontes, CSS global), pra minimizar o que também poderia falhar aqui.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("Erro não tratado no layout raiz:", error);
    }, [error]);

    return (
        <html lang="pt-BR">
            <body style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                minHeight: "100vh",
                padding: 24,
                textAlign: "center",
                fontFamily: "system-ui, sans-serif",
                background: "#0a122a",
                color: "#efe9f4",
            }}>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo deu errado</h1>
                <p style={{ maxWidth: 420, opacity: 0.8 }}>
                    Não foi possível carregar o Cronos agora. Tente novamente em alguns instantes.
                </p>
                <button
                    type="button"
                    onClick={() => reset()}
                    style={{
                        padding: "10px 20px",
                        borderRadius: 8,
                        background: "#ff6347",
                        color: "white",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    Tentar de novo
                </button>
            </body>
        </html>
    );
}
