# 📈 Plano de ampliação de cobertura de testes

Ponto de partida: `npm run test:coverage` reportava **18,43%** de statements logo após a mudança no `jest.config.ts` (denominador honesto — antes disso, o script `test:coverage-all` mostrava 15,81%; o `test:coverage` antigo, sem `collectCoverageFrom`, mostrava 68,32% porque só contava arquivos já importados por algum teste).

Este documento sequencia o trabalho para elevar essa cobertura testando o que **tem lógica de decisão real** — Server Actions e hooks — sem perseguir 100% em `page.tsx`, `layout.tsx` ou código que já está marcado para E2E.

Contexto completo da decisão (por que 15,8% ≠ 68%, por que Cypress não entra nesse número, por que mockar `apiFetch` é o comportamento correto em teste unitário): ver conversa que originou este plano e [`backlog-e-casos-de-teste.md`](backlog-e-casos-de-teste.md).

---

## ✅ Feito

- [x] `jest.config.ts`: adicionado `collectCoverageFrom` explícito (`src/**/*.{ts,tsx}`, excluindo `page.tsx`, `layout.tsx`, `src/types/**`, `*.d.ts`, `proxy.ts`, `resumoImagem.ts`)
- [x] `package.json`: removido `test:coverage-all` (redundante — o denominador agora é sempre o honesto, por padrão)

## Etapa 0 — Baseline

- [ ] Rodar `npm run test:coverage` após as mudanças acima e registrar o número de partida nesta página (preencher abaixo)
- [ ] Adicionar `docs/plano-cobertura-testes.md` (este arquivo) e commitar como ponto de partida rastreável

**Baseline registrado:** 18,43% statements / 16,38% branches / 19,02% funcs / 17,79% lines (17 suites, 110 testes)

---

## Etapa 1 — Server Actions simples (padrão CRUD de 1 chamada)

Todas seguem o mesmo esqueleto de `cadastrarDespesaAction` (auth → validação → `apiFetch` → `revalidatePath`/redirect → tratamento de `ApiError`). Servem de template umas para as outras — depois da primeira, as seguintes são replicação.

Ordem sugerida (da mais rica em branches para a mais simples):

- [x] `src/app/dashboard/residences/[code]/expenses/cadastrarDespesaAction.ts` — **primeira, serve de template**: auth, `parseValorParaCentavos` inválido, `safeParse` do Zod, sucesso com `competenciaTexto`, dois `revalidatePath`, `ApiError` vs. erro genérico (100% statements/branches/funcs/lines, 8 testes)
- [x] `src/app/dashboard/residences/[code]/expenses/editarDespesaAction.ts`
- [x] `src/app/dashboard/residences/[code]/expenses/excluirDespesaAction.ts`
- [x] `src/app/dashboard/residences/[code]/expenses/fecharMesAction.ts`
- [x] `src/app/dashboard/residences/[code]/expenses/reabrirMesAction.ts`
- [x] `src/app/dashboard/residences/[code]/expenses/recurring/pararRecorrenciaAction.ts`
- [x] `src/app/dashboard/residences/[code]/sairDaResidenciaAction.ts`
- [x] `src/app/dashboard/residences/[code]/removerMembroAction.ts`
- [x] `src/app/dashboard/residences/[code]/transferirPropriedadeAction.ts`
- [x] `src/app/dashboard/residences/[code]/arquivarResidenciaAction.ts`
- [x] `src/app/dashboard/residences/[code]/renomearResidenciaAction.ts`
- [x] `src/app/dashboard/residences/[code]/regenerarCodigoAction.ts` — atenção ao `data` extra no `ActionState<T>` (código novo)
- [x] `src/app/dashboard/residences/[code]/responderSolicitacaoAction.ts`
- [x] `src/app/dashboard/residences/[code]/cancelarConviteAction.ts`
- [x] `src/app/dashboard/residences/[code]/convidarUsuarioAction.ts`
- [x] `src/app/dashboard/residences/cancelarSolicitacaoAction.ts`
- [x] `src/app/dashboard/residences/responderConviteAction.ts`
- [x] `src/app/dashboard/residences/new/criarResidenciaAction.ts`
- [x] `src/app/dashboard/residences/join/entrarResidenciaAction.ts` — já parcialmente exercitado indiretamente via `EntrarResidenciaForm.test.tsx`, mas sem teste unitário próprio
- [x] `src/app/(auth)/cadastro/registerAction.ts` — mesmo caso: mockado em `RegisterForm.test.tsx`, sem teste unitário próprio
- [x] `src/app/profile/settings/password/changePasswordAction.ts`

**Etapa 1 concluída:** as 21 Server Actions estão em 100% statements/funcs/lines (branches ~100%, alguns arquivos com pequenas exceções não testáveis). 38 suites, 223 testes, todos passando.

**Padrão de mock a reaproveitar** (já usado em `expensesApi.test.ts`):
```ts
jest.mock("@/lib/apiClient", () => ({ apiFetch: jest.fn(), ApiError: /* reexportar a classe real */ }));
jest.mock("@/lib/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
```

## Etapa 2 — Hooks

- [x] `src/hooks/useResidencias.ts` — inclui fallback de `navigator.clipboard` negado
- [x] `src/hooks/useNotificacoes.ts`
- [x] `src/hooks/useProfile.ts`
- [x] `src/hooks/useAlertas.ts`
- [x] `src/hooks/useCompetenciaAberta.ts`
- [x] `src/hooks/useLogout.ts` (mais simples — bom aquecimento antes dos maiores)

Mockar `apiFetchClient` (mesma fronteira do `LoginForm.test.tsx`), usar `renderHook` do Testing Library.

**Etapa 2 concluída:** os 6 hooks estão em 100% statements/funcs/lines (branches 87,5–100%, poucos ramos residuais não testáveis, ex. cleanup de efeito já coberto indiretamente). 44 suites, 271 testes, todos passando.

## Etapa 3 — Hook composto de UI

- [ ] `src/app/dashboard/residences/[code]/useAcoesResidencia.ts` — orquestra 7 actions + confirmação + snackbar + redirect. Fazer **depois** da Etapa 1 (as actions que ele chama já estarão mockáveis com confiança) e da Etapa 2 (mesmo padrão de teste de hook).

## Etapa 4 — Função pura esquecida

- [ ] `src/utils/linkNotificacao.ts` — 20 linhas, 4 branches, sem dependência nenhuma. Pode ser feita a qualquer momento (inclusive antes da Etapa 1, como aquecimento).

## Fora de escopo (decisão consciente, não lacuna)

Não entram neste plano — candidatos a E2E ou baixo retorno, conforme já registrado em [`backlog-e-casos-de-teste.md`](backlog-e-casos-de-teste.md#-o-que-ainda-não-está-coberto):

- `page.tsx` / `layout.tsx` (excluídos do `collectCoverageFrom`)
- `src/utils/resumoImagem.ts` (canvas/fetch/DOM — excluído do `collectCoverageFrom`)
- `src/proxy.ts` (middleware — excluído do `collectCoverageFrom`)
- Componentes que buscam dados e montam tela inteira: `ConsultaDespesas`, `RelatorioResidencia`, `GraficosRelatorio`, `GerenciarMembros`, `AppShell`, `ConfiguracoesResidencia`, `Profile`, `SinoNotificacoes`, `DespesasRecorrentes`
- `CriarResidenciaForm`, `ChangePasswordForm`, `EditarDespesaModal` — redundantes estruturalmente com formulários já testados; replicar sob demanda se algum bug real aparecer ali

---

## Como acompanhar o progresso

Depois de cada etapa (ou grupo de arquivos dentro dela), rodar:

```bash
npm run test:coverage
```

e atualizar a tabela abaixo.

| Momento | Statements | Branches | Funcs | Lines | Suites | Testes |
|---|---|---|---|---|---|---|
| Baseline (pós-config) | 18,43% | 16,38% | 19,02% | 17,79% | 17 | 110 |
| Pós `cadastrarDespesaAction` | 20,08% | 17,43% | 19,28% | 19,54% | 18 | 118 |
| Pós Etapa 1 | 40,23% | 35,13% | 24,67% | 40,90% | 38 | 223 |
| Pós Etapa 2 | 52,93% | 40,29% | 34,96% | 53,85% | 44 | 271 |
| Pós Etapa 3 | | | | | | |
| Pós Etapa 4 | | | | | | |
