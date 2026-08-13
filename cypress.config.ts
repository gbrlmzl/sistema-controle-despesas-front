import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    // Roda contra um build de produção (ver scripts "test:e2e"/"test:e2e:open"
    // em package.json, que sobem "next start -p 3100"), não contra o dev
    // server. Em dev (Turbopack), a hidratação de algumas rotas às vezes não
    // termina a tempo do Cypress interagir — cliques silenciosamente não
    // fazem nada. Build de produção não tem esse problema.
    baseUrl: "http://localhost:3100",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
