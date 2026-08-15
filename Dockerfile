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
# next.config.ts lê API_URL para montar o rewrite /api/* -> API_URL/* e falha a
# build sem ela. O valor fica congelado no build (Next resolve o destino do
# rewrite em routes-manifest.json na hora do build, não a cada request) — para
# apontar pra outra API, é preciso rebuildar com outro --build-arg API_URL.
ARG API_URL=http://localhost:8080
ENV API_URL=$API_URL
RUN npm run build

# ---- prod-deps: só as dependências de produção, para a imagem final ----
# `next` é dependency (não devDependency), então sobrevive ao --omit=dev e o
# `next start` continua funcionando no runtime.
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: imagem final ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# --chown=node:node: os estágios anteriores rodam como root; sem isso o
# processo (que roda como "node" logo abaixo) não teria permissão sobre os
# arquivos, e o Next precisa escrever o cache de imagens/fetch em .next/cache.
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/public ./public
# next.config.ts é lido pelo `next start` no boot — sem ele, o rewrite /api/*
# não é registrado e o proxy para a API simplesmente não existe.
COPY --chown=node:node package.json next.config.ts ./

USER node
EXPOSE 3000

# Reusa o fetch global do Node 24 — evita instalar curl só para o healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
