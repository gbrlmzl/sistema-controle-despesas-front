# Estratégia: tratamento de falhas de comunicação com a API

> Documento de decisão. Depende da integração já feita em
> [plano-integracao-frontend-api.md](plano-integracao-frontend-api.md) (Fases 1-6, já
> implementadas). Nada foi alterado no código a partir daqui — é levantamento de opções para
> autorização posterior.

## 1. Por que isso não existia antes

Enquanto o Next.js falava direto com o Postgres via Prisma, "a fonte de dados está fora do ar"
não era um cenário realista de se tratar no front — o banco cair derrubava a aplicação inteira de
qualquer forma, e não havia uma segunda camada de rede no meio. Com a API em processo/host
separado, isso muda: a API pode estar reiniciando, fora do ar, lenta, ou simplesmente inacessível
por rede, **enquanto o processo do Next.js continua de pé e recebendo requisições normalmente**.
Esse é um cenário novo e que precisa de uma resposta deliberada, não um efeito colateral de outra
decisão.

O gatilho concreto: `src/proxy.ts` reconheceu a sessão pelo cookie normalmente, mas
`getCurrentUser()` (chamado em todo carregamento de página, a partir do layout raiz) recebeu
`ECONNREFUSED` da API e derrubou a aplicação inteira com um erro 500 — nenhuma página, nem a
pública, respondeu até a API voltar a responder.

## 2. Taxonomia das falhas possíveis

| Tipo | Exemplo | Hoje vira `ApiError`? |
| :---- | :---- | :---- |
| API inalcançável | processo fora do ar, rede indisponível (`ECONNREFUSED`, `ENOTFOUND`) | **Não** — `TypeError` puro do `fetch` |
| API lenta / travada | requisição nunca resolve (nem erro, nem sucesso) | **Não** — não há timeout configurado hoje em nenhuma chamada |
| Erro de negócio esperado | 401 (sessão expirada), 404 (não encontrado), 409 (conflito), 400 (validação) | Sim |
| Erro inesperado da API | 500 (bug do lado da API) | Sim, mas com mensagem genérica do `errorHandler` |

O ponto central: **só a última linha da tabela é tratada de forma consistente hoje**. As duas
primeiras — que são exatamente o que apareceu no teste manual — não são `ApiError` e escapam de
qualquer `if (error instanceof ApiError)` espalhado pelo código.

## 3. Levantamento do estado atual

Nem todo lugar que chama a API se comporta igual hoje — o comportamento já varia por tipo de
chamada, o que ajuda a enxergar onde falta cobertura:

| Onde | Arquivos | Falha de rede hoje |
| :---- | :---- | :---- |
| Leitura crítica de layout (roda em toda página) | `src/lib/session.ts` (`getCurrentUser`) | **Propaga e derruba a aplicação inteira** — só `ApiError` 401 é tratado |
| Leitura de página (Server Components) | `residenceApi.ts`, `expensesApi.ts`, `reportsApi.ts` | Propaga — sem tratamento nenhum, nem de `ApiError` |
| Escrita (Server Actions) | todas as ~25 actions (`cadastrarDespesaAction`, `criarResidenciaAction`, etc.) | **Já resiliente** — todo `catch` tem um fallback genérico além do `if (error instanceof ApiError)` |
| Leitura client-side (hooks) | `useResidencias`, `useAlertas`, `useNotificacoes`, `useProfile` | **Já resiliente** — mesmo padrão de fallback genérico |

Ou seja, o problema não é "a integração não trata erro" — é que **dois pontos específicos**
(`getCurrentUser` e as funções de leitura de página) ainda não têm o mesmo cuidado que o resto do
código já tem, e o primeiro deles é o de maior impacto possível: ele roda em **toda** renderização,
inclusive nas páginas públicas.

Também vale registrar: hoje não existe nenhum `error.tsx` nem `global-error.tsx` no projeto
(`find src/app -iname "error.tsx"` não encontra nada) — o mecanismo nativo do Next.js para conter
esse tipo de falha por rota simplesmente não está sendo usado ainda.

## 4. Opções

### Opção A — `getCurrentUser()` trata qualquer falha como "deslogado"

Ampliar o `catch` de `if (error instanceof ApiError && error.status === 401)` para qualquer erro,
devolvendo `null` em todos os casos.

- **Prós**: mudança de uma função só, resolve o crash imediato, seguindo o mesmo padrão que
  Server Actions e hooks já usam.
- **Contras**: mistura dois significados diferentes sob o mesmo `null` — "não estou logado" e "não
  consigo saber se estou logado". Um usuário genuinamente logado veria a Navbar cair para o estado
  deslogado sempre que a API piscar, mesmo com o cookie `JWT` ainda válido.

### Opção B — Diferenciar "deslogado" de "indisponível" explicitamente

`getCurrentUser()` passa a devolver um resultado com três estados (ex.:
`{status: 'authenticated', user} | {status: 'unauthenticated'} | {status: 'unreachable'}`) em vez
de `AuthUser | null`, e quem consome decide o que mostrar em cada caso — por exemplo, a Navbar
podia ter um terceiro estado visual ("—" ou um ícone de alerta) em vez de afirmar "Login" quando na
verdade não se sabe.

- **Prós**: honesto — nunca afirma algo que não sabe.
- **Contras**: maior superfície de mudança. `UserProvider`/`useCurrentUser()` e todo `if (!user)`
  hoje espalhado (Navbar, Profile, páginas que fazem `redirect` quando deslogado) precisam decidir
  o que fazer também no caso `unreachable` — não é mais um ajuste de uma função só.

### Opção C — Error boundaries nativas do Next.js (`error.tsx` / `global-error.tsx`)

Usar o mecanismo do App Router: qualquer exceção não tratada dentro de uma rota é capturada pelo
`error.tsx` mais próximo (um Client Component com botão "Tentar de novo", que chama `reset()`); a
única exceção é o `layout.tsx` raiz, que só é coberto por um `global-error.tsx` especial (que
substitui `<html>`/`<body>` inteiros quando ativado).

- **Prós**: é o padrão idiomático do framework — nenhuma função de leitura precisa de `try/catch`
  novo, só adicionar arquivos de boundary. Contém o estrago no nível certo (uma falha ao carregar
  o relatório de uma residência não devia derrubar o app inteiro) e dá UX de retry de graça.
  Cobre automaticamente qualquer chamada futura também, não só as que existem hoje.
- **Contras**: sozinha não resolve o `getCurrentUser()` no layout raiz da mesma forma —
  `global-error.tsx` troca a tela inteira (sem Navbar, sem nada) por uma página de erro, o que para
  uma falha isolada da API é uma experiência mais dura do que precisa ser (o usuário nem consegue
  ver a home pública).

### Opção D — Timeout e retry no `apiClient`

Adicionar `AbortSignal.timeout(...)` nas chamadas de `fetch` (hoje nenhuma chamada tem timeout — uma
API travada, não só fora do ar, deixa a requisição pendurada indefinidamente) e, opcionalmente, um
retry único e curto para falhas transitórias de rede (nunca para 4xx/5xx de negócio, só para erro
de transporte).

- **Prós**: evita que uma API lenta trave a renderização sem limite; suaviza falhas passageiras
  (a API reiniciando durante um deploy, por exemplo) sem o usuário perceber nada.
- **Contras**: não resolve sozinha a UX de quando a falha é persistente — ainda depende de A, B ou
  C por cima para decidir o que mostrar depois que o timeout/retry se esgota.

## 5. Como as opções se combinam

As opções não são mutuamente exclusivas — na prática cobrem camadas diferentes do mesmo problema:

| Camada | Resolvida por |
| :---- | :---- |
| "A requisição nunca volta" | D (timeout) |
| "A chamada falhou, o que a página mostra?" | C (error boundary com retry) |
| "O layout raiz especificamente falhou" | A ou B (já que C sozinha aqui vira `global-error.tsx`, mais drástico) |
| "O usuário sabe se é 'sessão expirada' ou 'serviço fora do ar'?" | Só B responde isso — A e C tratam os dois casos de forma indistinguível pro usuário |

## 6. Recomendação

Nesta ordem de prioridade (a primeira já resolve o crash observado; as demais são reforço):

1. **Opção A** para `getCurrentUser()` — ampliar o `catch` para qualquer erro, não só `ApiError`
   401. É a mudança mínima que impede a API fora do ar de derrubar a home pública e o `/login`, e
   segue o mesmo padrão que o resto do código (Server Actions, hooks) já adotou.
2. **Opção C** — adicionar pelo menos um `error.tsx` na raiz de `src/app/` (cobre todas as rotas
   que ainda não tratam falha de leitura: `residenceApi.ts`, `expensesApi.ts`, `reportsApi.ts`) e um
   `global-error.tsx` como rede de segurança final. Baixo custo, idiomático, e passa a cobrir
   automaticamente qualquer novo `apiFetch` que for adicionado depois — sem precisar lembrar de
   tratar erro em cada função nova.
3. **Opção D** — timeout nas chamadas do `apiClient`/`apiClient.client`. Baixo custo, evita a
   variante "trava" do mesmo problema (não só "cai").
4. **Opção B** fica como melhoria futura, não bloqueante — só vale o custo se em algum momento o
   produto quiser mostrar visualmente a diferença entre "sua sessão expirou" e "o serviço está fora
   do ar" (hoje a Opção A trata os dois de forma idêntica, o que é uma perda de informação, mas não
   impede o uso do sistema).

Com 1 + 2 + 3, a API cair deixa de ser uma falha total do front: a home e o login continuam de pé,
as páginas que dependem de dados da API mostram um retry em vez de uma tela em branco/erro do
Next.js, e nenhuma requisição fica pendurada indefinidamente.
