# syntax=docker/dockerfile:1

# Debian slim: o front não tem nenhuma dependência nativa (só JS puro e os
# binários prebuilt do SWC, que precisam de glibc) — a imagem completa do
# node traz git/python/gcc que nada aqui usa.
ARG NODE_VERSION=24-bookworm-slim

# ---- deps: todas as dependências (dev + prod), usadas para buildar ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci (não install): instalação determinística a partir do lock, e falha o
# build se package.json e package-lock.json estiverem fora de sincronia — é o
# mesmo comando que a CI usa para validar, então a imagem recebe exatamente a
# árvore de dependências que foi testada.
RUN npm ci

# ---- build: gera o .next de produção ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# ARG depois do COPY de propósito: como um ARG só invalida o cache das camadas
# seguintes, trocar o API_URL refaz apenas o `npm run build` — não o npm ci.
#
# Este valor NÃO fica congelado em nenhum manifesto — desde que o rewrite de
# next.config.ts virou o Route Handler em src/app/api/[...path]/route.ts
# (Abordagem B de docs/problema-rewrite-api-build-time.md), o endereço da API
# é lido de process.env.API_URL a cada requisição, em runtime. O ARG só
# precisa existir porque o Next avalia o módulo de cada rota durante
# "Collecting page data" (etapa do `next build`), e o route handler acima
# (junto com src/lib/apiClient.ts e src/proxy.ts) lança erro se a variável
# estiver vazia — é um guard de "não suba sem isso", não uma resolução de
# endereço. Um placeholder aqui é suficiente; o endereço real vem do
# ambiente do container em runtime (task definition / docker-compose).
ARG API_URL=http://localhost:8080
ENV API_URL=$API_URL
RUN npm run build

# ---- runtime: imagem final ----
# output: 'standalone' (next.config.ts) faz o `next build` já rastrear e copiar,
# dentro de .next/standalone, só o server.js gerado e o subconjunto podado de
# node_modules que o app realmente usa em runtime — dispensa o antigo estágio
# prod-deps (um `npm ci --omit=dev` à parte) e derruba o payload da aplicação
# de >1 GB (node_modules de produção inteiro) para ~47 MB (medido localmente:
# standalone 43 MB + .next/static 2 MB + public 2 MB). A imagem final soma
# ~390 MB porque a base node:24-bookworm-slim (glibc, ver ARG acima) já
# contribui uns 250 MB sozinha — trocar a base está fora do escopo aqui.
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# --chown=node:node: o estágio anterior roda como root; sem isso o processo
# (que roda como "node" logo abaixo) não teria permissão sobre os arquivos, e
# o Next precisa escrever o cache de imagens/fetch em .next/cache.
COPY --chown=node:node --from=build /app/.next/standalone ./
# O standalone NÃO traz .next/static nem public sozinho (só o server e o
# node_modules podado) — sem essas duas cópias manuais a app sobe normalmente,
# mas serve páginas sem CSS, sem JS de cliente e sem imagens.
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public

USER node
EXPOSE 3000
# server.js do standalone faz bind em process.env.HOSTNAME, e o Docker define
# essa variável como o ID do container — sem forçar 0.0.0.0, o servidor escuta
# só no IP da bridge e qualquer sonda via localhost (HEALTHCHECK, compose,
# ECS) é recusada. O "next start" antigo não tinha esse comportamento.
ENV HOSTNAME=0.0.0.0

# Reusa o fetch global do Node 24 — evita instalar curl só para o healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# server.js é gerado pelo próprio Next dentro do standalone, com o config já
# resolvido embutido (rewrites incluso) — substitui o "npm start" (next start),
# que exigia o node_modules de produção completo para funcionar.
CMD ["node", "server.js"]
