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
};

// createJestConfig é exportado dessa forma para garantir que next/jest possa
// carregar a configuração do Next.js, que é assíncrona
export default createJestConfig(config);
