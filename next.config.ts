import type { NextConfig } from "next";

const API_URL = process.env.API_URL;

if (!API_URL) {
    throw new Error("Variável de ambiente API_URL não configurada.");
}

//Proxy same-origin: o navegador só fala com o próprio domínio do front em
///api/*, nunca diretamente com a API. Isso evita CORS e faz os cookies de
//sessão (JWT/refreshToken) pertencerem ao domínio do front, não ao da API —
//essencial pro proxy.ts (guarda de rota) conseguir enxergá-los.
const nextConfig: NextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${API_URL}/:path*`,
            },
        ];
    },
};

export default nextConfig;
