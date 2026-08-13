# Plano: Integração do front-end (Next.js) com a API Express

> Documento de planejamento. Nada foi implementado ainda. Depende do
> [plano da API](plano-api-node-express.md) (fases 1-5, já concluídas no repositório
> `sistema-controle-despesas-api`) e da
> [decisão de arquitetura de frontend](decisao-arquitetura-frontend.md). Este documento é,
> na prática, o detalhamento da **Fase 6** citada naquele plano.

## 1. Estado atual confirmado

Antes de planejar o resto, o que já existe de fato (verificado nos dois repositórios, não
assumido a partir dos planos anteriores):

- **API (`sistema-controle-despesas-api`)**: completa até a fase 5 do plano original —
  setup, auth (JWT + refresh rotativo + Google OAuth), residências, despesas + relatórios,
  notificações + usuário. Roda a partir de `src/server.ts`, framework Express 5, Prisma
  próprio (`prisma/`, gerado em `src/generated/`). Testes com Jest + Supertest já
  configurados (`tests/`), mas **ainda não escritos** (fase 7 do plano da API).
- **Repositórios já separados fisicamente** (`sistema-controle-despesas` e
  `sistema-controle-despesas-api`, pastas irmãs). Isso já é a **Opção 3** do documento de
  decisão de arquitetura, não a "Opção 2 (mesmo repo) por enquanto" que aquele documento
  recomendava como ponto de partida — o projeto avançou além da recomendação original. Não
  bloqueia este plano, mas vale atualizar aquele documento depois para refletir a decisão
  real tomada.
- **Front-end (`sistema-controle-despesas`)**: branch `migracao-typescript`, migração para
  TypeScript concluída. Autenticação ainda é 100% NextAuth (`src/auth.ts`,
  `src/auth.config.ts`, `src/proxy.ts`, `src/app/api/auth/[...nextauth]/route.ts`). Toda
  leitura e escrita de dados ainda passa por Prisma direto: 23 Server Actions
  (`'use server'`) e Server Components fazendo `db.*` diretamente, mais 4 Route Handlers.

## 2. Decisão que este documento assume — leia antes do resto

A API não implementou só os 4 endpoints REST originalmente cogitados no Escopo A — ela
implementou **autenticação própria e completa**: JWT de acesso (`15m`, cookie `httpOnly`
`JWT`) + refresh token rotativo com detecção de reuso (cookie `httpOnly` `REFRESH`) + login
Google via `passport-google-oidc`.

Isso muda o tamanho real da integração: **não é possível manter o NextAuth e a API
convivendo por muito tempo** sem duas fontes de verdade sobre "quem está logado". A
integração de verdade implica **substituir o NextAuth inteiramente** pelo mecanismo de
sessão da API — não é só trocar `fetch()` por Server Action, é também trocar o mecanismo de
autenticação do front-end do zero.

**Recomendação deste documento:** seguir com a substituição completa do NextAuth (é a
continuação natural do Escopo B já em andamento na API). Isso é sinalizado aqui porque é a
parte de maior risco e maior superfície de mudança do plano — se o tempo disponível for
curto, a alternativa é manter o NextAuth por mais uma fase e integrar só os domínios de
dados (residências/despesas/notificações), adiando auth — mas isso deixa duas sessões
paralelas coexistindo, o que não é um estado estável para se manter por muito tempo.

## 3. Peças novas necessárias no front-end

Nenhum domínio pode ser migrado sem isto primeiro — é a base de que todas as fases
seguintes dependem.

| Peça | Por quê |
| :---- | :---- |
| `src/lib/apiClient.ts` — wrapper de `fetch()` para chamadas à API (base URL, `credentials`/cookie forwarding, parsing de erro padronizado) | Hoje não existe nenhuma chamada HTTP externa no front-end; toda leitura/escrita é Prisma direto. Sem um cliente único, cada domínio reinventaria tratamento de erro e de cookies. |
| Variável de ambiente `API_URL` (server-side) e, se necessário, `NEXT_PUBLIC_API_URL` (caso alguma chamada precise sair do navegador) | A API roda em processo/porta própria (`PORT=3001` por padrão); o front-end precisa saber o endereço. Hoje `.env`/`.env.local` só têm variáveis do Prisma e do NextAuth (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`). |
| Encaminhamento de cookies em Server Components/Actions | `fetch()` do lado do servidor Next.js **não** encaminha automaticamente os cookies da requisição recebida do navegador para uma origem diferente (a API). É preciso ler `cookies()` (Next.js) e repassar manualmente o header `Cookie` nas chamadas ao `apiClient`, e repassar `Set-Cookie` da resposta da API de volta ao navegador. |
| Reescrita de `src/proxy.ts` | Hoje usa `auth()` do NextAuth (que lê a sessão via Prisma/JWT do NextAuth). Passa a checar a presença/validade do cookie `JWT` emitido pela API. **Risco técnico concreto:** a biblioteca `jsonwebtoken` (usada na API) depende do módulo `crypto` do Node e **não roda no Edge Runtime** — o mesmo motivo que já forçou a separação de `auth.config.ts` na migração anterior (ver memória do projeto). Duas saídas: (a) o proxy só checa se o cookie existe (sem verificar assinatura) e cada página/endpoint confirma de verdade ao chamar a API, que já faz isso; ou (b) trocar a verificação no proxy para `jose` (compatível com Web Crypto/Edge). **Recomendação: opção (a)** — mais simples, e o proxy já era descrito como "só resolve tem sessão ou não" (autorização de verdade sempre foi responsabilidade de outra camada). |
| CORS/cookies em dev | A API já habilita `cors({ credentials: true })`, mas sem restringir `origin` — isso precisa ser fechado para a origem real do front-end antes de qualquer ambiente que não seja localhost. Em dev, se front e API rodarem em portas diferentes (`localhost:3000` e `localhost:3001`), `sameSite: 'lax'`/`'strict'` dos cookies da API já cobre same-site (mesmo domínio, porta diferente ainda conta como same-site para `SameSite`), então deve funcionar sem ajuste adicional — mas é o primeiro cenário a testar manualmente na Fase 1 abaixo. |

## 4. Autenticação — mapeamento detalhado

| Mecanismo atual (NextAuth) | Mecanismo novo (API) |
| :---- | :---- |
| `signIn('credentials', {...})` em `loginAction.ts` | `POST /auth/login` via `apiClient`, API seta cookies `JWT` + `REFRESH` |
| Registro (hoje só cria usuário via Prisma + login implícito) | `POST /auth/register` — já retorna sessão estabelecida (mesmo `establishSession` do login) |
| `GoogleProvider` do NextAuth (`src/auth.ts`) | `GET /auth/google` (redirect) + `GET /auth/google/callback` — o **navegador** navega direto para esses endpoints da API (não é uma chamada `fetch()`), já que é um fluxo de redirecionamento OAuth completo |
| Refresh automático de sessão (NextAuth cuida disso via JWT callback) | Não existe automaticamente — precisa de lógica própria: quando uma chamada à API retornar 401, tentar `POST /auth/refresh` uma vez e repetir a chamada original; se o refresh também falhar, tratar como deslogado |
| `signOut()` | `POST /auth/logout` — revoga o refresh token no banco e limpa os dois cookies |
| `auth()` (ler sessão em Server Component) | Nenhum equivalente direto — a sessão passa a ser "o que a API responde" ao receber os cookies encaminhados; não há mais um objeto de sessão local. Cada Server Component que hoje chama `auth()` passa a inferir "logado ou não" pela resposta 401 de alguma chamada à API, ou por uma checagem leve dedicada (ex.: endpoint `GET /users/me`, que hoje não existe e precisaria ser adicionado à API se for necessário "quem sou eu" sem tocar em nenhum outro domínio) |
| `src/app/api/auth/[...nextauth]/route.ts` | Removido — não há mais handler de auth no lado do Next.js |
| `src/auth.ts`, `src/auth.config.ts` | Removidos |
| Dependência `next-auth` no `package.json` | Removida |

**Nota:** o item "`auth()` sem equivalente direto" é o ponto mais delicado do mapeamento —
vale confirmar com um pequeno spike na Fase 2 (seção 6) antes de assumir a solução acima
como definitiva.

## 5. Mapeamento completo: o que é substituído, pelo quê

### 5.1 Route Handlers (`src/app/api/**`, 4 arquivos — todos removidos)

| Arquivo atual | Endpoint da API que assume o lugar |
| :---- | :---- |
| `api/auth/[...nextauth]/route.ts` | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/google`, `GET /auth/google/callback` |
| `api/notifications/route.ts` (GET) | `GET /notifications` |
| `api/notifications/route.ts` (PATCH) | `PATCH /notifications` |
| `api/residences/route.ts` (GET) | `GET /residences` |
| `api/users/me/route.ts` (PATCH) | `PATCH /users/me` |

### 5.2 Server Actions (`src/app/(auth)/**`, 23 arquivos)

**Auth / usuário**

| Arquivo atual | Endpoint |
| :---- | :---- |
| `(logout)/logoutAction.ts` | `POST /auth/logout` |
| `cadastro/registerAction.ts` | `POST /auth/register` |
| `login/loginAction.ts` | `POST /auth/login` |
| `profile/settings/password/changePasswordAction.ts` | `PATCH /users/me/password` |

**Residências (nível raiz)**

| Arquivo atual | Endpoint |
| :---- | :---- |
| `app/residences/new/criarResidenciaAction.ts` | `POST /residences` |
| `app/residences/join/entrarResidenciaAction.ts` | `POST /residences/join-requests` |
| `app/residences/cancelarSolicitacaoAction.ts` | `DELETE /residences/join-requests/:id` |
| `app/residences/responderConviteAction.ts` | `PATCH /residences/invites/:id` (`{ status: 'accepted' \| 'declined' }`) |

**Residências (dentro do contexto `[code]`)**

| Arquivo atual | Endpoint |
| :---- | :---- |
| *(painel — leitura direta de Prisma em `page.tsx`)* | `GET /residences/:code` |
| `[code]/renomearResidenciaAction.ts` | `PATCH /residences/:code` (`{ name }`) |
| `[code]/arquivarResidenciaAction.ts` | `PATCH /residences/:code` (`{ archived: true }` — **mesmo endpoint** do renomear, campo diferente no corpo) |
| `[code]/regenerarCodigoAction.ts` | `POST /residences/:code/code` |
| `[code]/sairDaResidenciaAction.ts` | `DELETE /residences/:code/members/me` |
| `[code]/removerMembroAction.ts` | `DELETE /residences/:code/members/:userId` |
| `[code]/transferirPropriedadeAction.ts` | `PUT /residences/:code/owner` (`{ userId }`) |
| `[code]/responderSolicitacaoAction.ts` | `PATCH /residences/join-requests/:id` (`{ status }`) |
| `[code]/cancelarConviteAction.ts` | `DELETE /residences/invites/:id` |
| `[code]/convidarUsuarioAction.ts` | `POST /residences/:code/invites` (`{ username }`) |

**Despesas**

| Arquivo atual | Endpoint |
| :---- | :---- |
| *(consulta — leitura direta de Prisma na página de despesas)* | `GET /residences/:code/expenses` |
| `expenses/cadastrarDespesaAction.ts` | `POST /residences/:code/expenses` |
| `expenses/editarDespesaAction.ts` | `PATCH /residences/:code/expenses/:expenseId` |
| `expenses/excluirDespesaAction.ts` | `DELETE /residences/:code/expenses/:expenseId` |
| `expenses/fecharMesAction.ts` | `POST /residences/:code/expenses/month-closures` |
| `expenses/reabrirMesAction.ts` | `DELETE /residences/:code/expenses/month-closures/:period` |
| *(recorrentes — leitura direta)* | `GET /residences/:code/expenses/recurring` |
| `expenses/recurring/pararRecorrenciaAction.ts` | `DELETE /residences/:code/expenses/:expenseId/recurrence` |

**Relatórios**

| Origem atual | Endpoint |
| :---- | :---- |
| `src/lib/reports.ts` (consumido só pela página de relatórios) | `GET /residences/:code/reports` |

### 5.3 Server Components que leem Prisma diretamente

Além das Server Actions, páginas como `app/residences/[code]/page.tsx`,
`app/residences/page.tsx`, `app/page.tsx` e `app/alerts/page.tsx` chamam `db.*` e funções de
`src/lib/*.ts` diretamente. Todas passam a chamar o `apiClient` (seção 3) em vez de
`db`/`src/lib/*.ts` — continuam podendo ser Server Components normais (RSC não exige acesso
direto ao banco, só a alguma fonte de dados; `fetch()` do lado do servidor funciona igual).
Isso confirma, na prática, o que o documento de decisão de arquitetura já apontava: manter
Next.js não obriga abrir mão da API separada nem virar `'use client'` em tudo.

### 5.4 O que fica no front-end sem mudança

- `src/schemas/*.ts` (Zod) — a API tem cópias próprias (`src/schemas/*.ts` no repo da API);
  os dois lados continuam validando o mesmo formato, mas são cópias independentes, não um
  pacote compartilhado (fora de escopo deste plano introduzir um monorepo/pacote comum).
- `src/generated/client` (Prisma Client do front-end) — deixa de ser usado para leitura/
  escrita de domínio, mas nada obriga removê-lo neste plano; pode ficar órfão até uma limpeza
  posterior, ou ser removido junto se ficar confirmado que nada mais o importa.
- Componentes de apresentação (formulários, tabelas, etc.) — mudam apenas na forma de
  disparar a ação (ver seção 6), não na estrutura visual.

## 6. O que muda no *padrão* de código, não só no destino da chamada

- Todo `useActionState(algumaAction, ...)` + `<Form action={formAction}>` precisa de uma
  Server Action "fina" que só chama o `apiClient` e traduz a resposta para o formato
  `ActionState` já usado (`src/types/actions.ts`) — ou seja, a Server Action **continua
  existindo como camada de RPC do Next.js**, só que o corpo dela vira uma chamada HTTP em
  vez de uma chamada Prisma direta. Isso preserva o padrão de UI (`useActionState`,
  mensagens de erro) sem reescrever componentes de formulário.
- `revalidatePath(...)` continua funcionando como está, porque a Server Action ainda roda no
  servidor Next.js — só o que ela faz por dentro muda (HTTP em vez de Prisma). Não é
  necessário introduzir SWR/TanStack Query neste plano.
- Erros: a API responde `{ message }` (mais status HTTP) em vez de lançar exceções do
  Prisma; o `apiClient` deve normalizar isso para o formato `ActionState` (`{ success:
  false, message }`) num único lugar, não em cada Server Action.
- Endpoints com `204 No Content` (`leave`, `removeMemberHandler`, `transferOwner`) não têm
  corpo de resposta — o `apiClient` precisa tratar esse caso sem tentar fazer `.json()`.

## 7. Fases de integração (incrementais)

Mesma lógica de "fase pronta = domínio migrado rodando e testado" usada na migração
TypeScript e no plano da API.

1. **Fundação** — criar `apiClient`, variáveis de ambiente, resolver encaminhamento de
   cookies, testar manualmente um `fetch()` simples de ida e volta (ex.: `GET /health`)
   antes de tocar em qualquer domínio real.
2. **Auth** — substituir NextAuth (login, registro, logout, Google, refresh silencioso,
   reescrever `proxy.ts`). É a fase de maior risco; termina quando um usuário consegue
   logar, navegar por rotas protegidas e deslogar usando só a API.
3. **Residências** — os 9 endpoints de residência/membros/pendências + a listagem raiz.
4. **Despesas + relatórios** — os 8 endpoints de despesas + relatórios (mais complexo,
   depende de residências já migradas para o contexto `[code]` funcionar).
5. **Notificações + usuário** — os 2 route handlers restantes (o menor domínio).
6. **Limpeza** — remover `next-auth` do `package.json`, `src/auth*.ts`, e decidir o destino
   de `src/generated/client`/Prisma no front-end (remover ou manter órfão).

Cada fase pode ser testada isoladamente no navegador antes de avançar para a próxima —
mesmo roteiro de verificação já usado nas migrações anteriores do projeto.

## 8. Testes a serem criados

O `jest.config.ts`/`babel.config.cjs`/`__mocks__/` que já aparecem no repositório (ainda sem
commit nesta branch) são a base de teste que este plano vai usar — não é necessário montar
nova infraestrutura de teste.

| Teste | O que cobre | Quando |
| :---- | :---- | :---- |
| Unitário — `apiClient` | Montagem de headers/cookies, parsing de erro (`{message}` → `ActionState`), tratamento de `204`, retry único em 401 via `/auth/refresh` | Fase 1, antes de qualquer domínio |
| Unitário — Server Actions migradas | Cada Server Action "fina" (login, cadastro de despesa, etc.) com `apiClient` mockado — confirma que a tradução resposta-da-API → `ActionState` está correta, sem depender da API real subindo | Junto de cada fase (2-5), por domínio |
| Integração leve — fluxo de auth no front | Login → cookie setado → rota protegida acessível → logout → rota protegida bloqueada, com a API real rodando localmente (não mockada) | Fase 2 |
| Manual (roteiro no navegador) | Paridade funcional de cada domínio migrado contra o comportamento atual (Prisma direto) — mesmo critério já usado nas migrações anteriores do projeto | Fim de cada fase (2-6) |
| Regressão de `proxy.ts` | Confirma que rotas protegidas continuam bloqueando usuário deslogado e que as regras especiais (ex.: `/profile/settings/password` só para contas de credenciais) sobrevivem à reescrita | Fase 2 |

Testes automatizados de UI ponta a ponta (Playwright, por exemplo) e os testes unitários/
integração do lado da **API** (fase 7 do plano da API, com Supertest) ficam fora do escopo
deste documento — são tratados nos respectivos planos.

## 9. Riscos e mitigação

| Risco | Mitigação |
| :---- | :---- |
| `jsonwebtoken` não roda no Edge Runtime, quebrando a reescrita de `proxy.ts` | Proxy só checa presença do cookie (sem verificar assinatura); validação real sempre acontece na API a cada chamada — ver seção 3 |
| Duas sessões (NextAuth + API) coexistindo por tempo demais durante a migração | Seguir a ordem das fases estritamente: Fase 2 (auth) migra por completo antes de qualquer outro domínio, justamente para não ter as duas fontes de verdade ao mesmo tempo |
| CORS/cookies quebram em algum ambiente (dev vs. produção, domínios diferentes) | Testar o cenário cross-origin cedo, na Fase 1, com uma chamada simples antes de migrar qualquer domínio de negócio (mesma mitigação já prevista no plano da API) |
| Regressão de comportamento (endpoint novo não faz exatamente o que a Server Action fazia) | A lógica de negócio já foi portada quase 1:1 dos `lib/*.ts` originais para os `services/` da API (confirmado no plano da API, seção 3) — o risco concentra-se na camada de tradução HTTP, não na regra de negócio em si |
| CORS da API está aberto (`origin` não restringido) | Restringir a origem exata do front-end antes de qualquer ambiente que não seja localhost — não é um item deste plano de integração, mas é bloqueante para produção |

## 10. Estimativa de tempo

Estimativa em dias de trabalho focado, considerando que a API já está pronta (only fases 6-7
do plano original restam, e são o que este documento detalha).

| Etapa | Estimativa |
| :---- | :---- |
| Fase 1 — Fundação (`apiClient`, env vars, cookies) | 1-2 dias |
| Fase 2 — Auth (a mais arriscada) | 4-6 dias |
| Fase 3 — Residências | 2-3 dias |
| Fase 4 — Despesas + relatórios | 2-3 dias |
| Fase 5 — Notificações + usuário | 1 dia |
| Fase 6 — Limpeza | 1 dia |
| Testes (seção 8, junto de cada fase) | somado dentro de cada fase acima, não em separado |
| **Total** | **~11-16 dias de trabalho focado** |

## 11. Critério de "pronto"

1. `npm test` (front-end) passa, incluindo os testes novos da seção 8.
2. Nenhum arquivo em `src/app/**` (fora de `src/deprecated/`, que continua fora de escopo)
   importa `@/lib/prisma` ou `@/generated/client` diretamente — toda leitura/escrita passa
   pelo `apiClient`.
3. `next-auth` removido de `package.json`; `src/auth.ts` e `src/auth.config.ts` removidos.
4. Cada domínio migrado tem paridade funcional confirmada manualmente no navegador
   (roteiro da seção 8) contra o comportamento anterior.
5. Login por credenciais, login Google, refresh silencioso e logout funcionam de ponta a
   ponta usando só os cookies emitidos pela API.
