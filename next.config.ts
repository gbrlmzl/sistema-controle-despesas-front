import type { NextConfig } from "next";

//Proxy same-origin: o navegador só fala com o próprio domínio do front em
///api/*, nunca diretamente com a API. Isso evita CORS e faz os cookies de
//sessão (JWT/refreshToken) pertencerem ao domínio do front, não ao da API —
//essencial pro proxy.ts (guarda de rota) conseguir enxergá-los.
//
//O proxy em si é o Route Handler em src/app/api/[...path]/route.ts, não um
//rewrite deste arquivo: um rewrite tem o destino resolvido em build-time
//(gravado em routes-manifest.json), então trocar API_URL em runtime não
//tinha efeito nele — foi a causa do incidente registrado em
//docs/problema-rewrite-api-build-time.md. O Route Handler lê
//process.env.API_URL a cada requisição, como os outros dois consumidores
//(apiClient.ts e proxy.ts) já faziam.
const nextConfig: NextConfig = {
    // standalone: o Next rastreia só os arquivos e o subconjunto de node_modules
    // realmente usados em runtime, em vez de exigir o node_modules de produção
    // inteiro na imagem (>1 GB vira ~47 MB de payload da app — ver Dockerfile).
    // Essencial pra caber na instância t4g.small (2 GB de RAM, divididos com o
    // Postgres e a API, que rodam na mesma máquina).
    output: "standalone",
};

export default nextConfig;
