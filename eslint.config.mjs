import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // .claude/worktrees/ guarda cópias completas do repo (sessões isoladas do
  // Claude Code) — sem isso, "eslint ." varre o mesmo código-fonte
  // duplicado várias vezes.
  { ignores: [".claude/**"] },
  ...nextCoreWebVitals,
  {
    rules: {
      // Regra nova (React 19.2 / eslint-config-next 16) e ainda agressiva:
      // aponta setState assíncrono após um fetch-on-mount (padrão recomendado
      // pela própria doc do React) junto com casos síncronos genuínos. Nenhum
      // dos dois é bug de comportamento — vira warning até virar refactor
      // deliberado, sem travar o CI.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
