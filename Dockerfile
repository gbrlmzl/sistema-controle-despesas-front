FROM node:24
WORKDIR /app-node

COPY package*.json ./
RUN npm install
EXPOSE 3000
COPY . .

# next.config.ts lê API_URL para montar o rewrite /api/* -> API_URL/* e
# falha a build sem ela. O valor fica congelado no build (Next resolve o
# destino do rewrite em routes-manifest.json na hora do build, não a cada
# request) — para apontar pra outra API, é preciso rebuildar com outro
# --build-arg API_URL.
ARG API_URL=http://localhost:8080
ENV API_URL=$API_URL

# Gera o build de produção
RUN npm run build

ENTRYPOINT ["npm", "start"]