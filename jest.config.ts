/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Caminho do app Next.js, usado para carregar next.config.ts e os arquivos .env
  dir: "./",
});

const config: Config = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  modulePathIgnorePatterns: ["<rootDir>/.claude/"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  testEnvironment: "jsdom",

  // Denominador único e honesto: sempre todo o src/, não só o que os testes
  // atuais importam. Exclui apenas o que estruturalmente não compensa testar
  // via Jest (composição de rota, tipos, e o que já está marcado para E2E
  // em docs/backlog-e-casos-de-teste.md).
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/page.tsx",
    "!src/**/layout.tsx",
    "!src/types/**",
    "!src/**/*.d.ts",
    "!src/proxy.ts",
    "!src/utils/resumoImagem.ts",
  ],
};

// createJestConfig é exportado dessa forma para garantir que next/jest possa
// carregar a configuração do Next.js, que é assíncrona
export default createJestConfig(config);
