# 🕓 CRONOS — Sistema de Controle de Despesas

> _"O amigo que te ajuda a controlar suas despesas!"_

Aplicação web para **controle colaborativo de despesas de uma casa compartilhada**. Cada usuário cria ou entra em uma **residência**, os membros lançam suas despesas ao longo do mês, e o sistema consolida tudo por competência: total por membro, relatórios por categoria, comparativo entre meses e o **rateio** que aponta quem paga e quem recebe para todos ficarem quites.

Este repositório contém o **front-end**. O back-end vive em um projeto separado: [`sistema-controle-despesas-api`](https://github.com/gbrlmzl/sistema-controle-despesas-api).

---

## 📑 Índice

- [Arquitetura geral](#-arquitetura-geral)
- [Funcionalidades](#-funcionalidades)
- [Stack & Tecnologias](#-stack--tecnologias)
- [Estrutura do front-end](#-estrutura-do-front-end)
- [Rotas do front-end](#-rotas-do-front-end)
- [Autenticação e sessão](#-autenticação-e-sessão)
- [API REST](#-api-rest)
- [Modelo de dados](#-modelo-de-dados)
- [Regras de negócio](#-regras-de-negócio)
- [Testes](#-testes)
- [Como rodar](#-como-rodar)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Convenções de código](#-convenções-de-código)
- [Documentação complementar](#-documentação-complementar)
- [Pendências conhecidas](#-pendências-conhecidas)

---

## 🏗️ Arquitetura geral

Na V1 o projeto era um monolito Next.js (Route Handlers + Server Actions + Prisma no mesmo repositório). Na **V2.0** o back-end foi extraído para uma **API Express independente**, e o Next.js passou a ser um consumidor dela — mantendo, porém, SSR e React Server Components. A decisão e as alternativas consideradas estão em [`docs/decisao-arquitetura-frontend.md`](docs/decisao-arquitetura-frontend.md).

```
┌───────────────┐   /api/:path*      ┌──────────────────┐   Prisma    ┌────────────┐
│   Navegador   │ ─── proxy runtime ►│  Next.js (front) │ ──────────► │            │
│               │                    │   :3000          │  fetch      │            │
│  cookies do   │ ◄──────────────────│                  │ ──────────► │ API Express│ ──► PostgreSQL
│  domínio do   │                    └──────────────────┘             │   :8080    │
│    front      │                                                     └────────────┘
└───────────────┘
```

Dois pontos que definem essa integração:

- **Proxy same-origin.** O navegador nunca fala direto com a API. O Route Handler em [`src/app/api/[...path]/route.ts`](<src/app/api/[...path]/route.ts>) encaminha as chamadas do cliente para a API, lendo `process.env.API_URL` a cada requisição — não em build-time (um `rewrite` anterior resolvia esse endereço em build, congelado em `routes-manifest.json`, e causou uma indisponibilidade em produção antes de ser substituído por este mecanismo). Assim não há CORS no navegador e os cookies de sessão pertencem ao domínio do front — o que é essencial para o [`src/proxy.ts`](src/proxy.ts) conseguir enxergá-los.
- **Server Components chamam a API direto.** Páginas e Server Actions usam [`lib/apiClient.ts`](src/lib/apiClient.ts), que fala com a API server-to-server e repassa os cookies manualmente (o `fetch` do servidor não faz isso sozinho para outra origem).

---

## ✨ Funcionalidades

Organizadas pelos épicos do [documento de requisitos da V2.0](docs/release-v2.0-requisitos.md).

### Conta e identidade

| Funcionalidade | Descrição |
|---|---|
| **Cadastro e login** | Conta com nome, `username`, e-mail e senha. O **login é feito pelo `username`**, não pelo e-mail. |
| **Login com Google** | OAuth via Google (opcional — a API funciona sem ele). Gera um `username` automático a partir do e-mail. |
| **Recuperação de senha** | Link por email (`/forgot-password` → `/change-password`), sem abrir sessão ao final — o usuário faz login com a senha nova. Resposta sempre `200`, mesmo para email inexistente (anti-enumeração). |
| **Identificador público (`username`)** | Campo único e público que permite convidar alguém sem expor o e-mail. |
| **Perfil** | Edição do nome e escolha entre **20 avatares SVG**; conta Google traz a foto da conta. |
| **Alterar senha** | Só para contas com senha local (contas só-Google não têm o que trocar). |
| **Tema claro / escuro** | Alternância pelo botão de sol/lua do [`AppShell`](src/components/layout/AppShell.tsx). O escuro é o tema original e o padrão; a escolha fica em `localStorage` e é aplicada por um script inline antes da hidratação, para não piscar. |

### Residências

| Funcionalidade | Descrição |
|---|---|
| **Criar residência** | Nome livre; o sistema gera um **código curto e único** que identifica a casa. |
| **Listar residências** | Todas as residências das quais o usuário é membro, com criador e ação de copiar o código. |
| **Painel da residência** | Visão geral com resumo do mês, membros e atalhos para despesas e relatórios. |
| **Renomear / arquivar** | Só o owner. Residência arquivada fica **somente leitura**. |
| **Sair da residência** | Membro sai por vontade própria; o owner precisa **transferir a propriedade** antes. |
| **Remover membro** | Só o owner, e nunca a si mesmo. |
| **Transferir propriedade** | Passa o papel de owner para outro membro, em transação única. |
| **Regenerar código** | Invalida o código anterior (útil se ele vazou) e derruba as solicitações pendentes. |

### Acesso: convites e solicitações

Dois fluxos simétricos de entrada:

| Fluxo | Como funciona |
|---|---|
| **De fora para dentro** — solicitação | O usuário digita o **código** da residência e gera uma solicitação, que o owner aceita ou recusa. |
| **De dentro para fora** — convite | O owner convida alguém pelo **`username`**; o convidado aceita ou recusa. Convites expiram em **7 dias**. |

Complementos: **cancelamento** pelo próprio autor enquanto pendente, **central de notificações** (sino no `AppShell` + tela dedicada) e **proteção contra tentativa em massa** de códigos.

Do lado de dentro, convites enviados e solicitações recebidas moram em uma **tela própria** (`/dashboard/residences/[code]/members/requests`), separada da gestão de membros. Do lado de fora, as pendências do próprio usuário (convites recebidos e solicitações enviadas) aparecem na lista de residências.

### Despesas colaborativas

| Funcionalidade | Descrição |
|---|---|
| **Lançar despesa** | Qualquer membro lança, de forma incremental, a qualquer momento do mês. Valor guardado **em centavos**. O formulário é um **modal** aberto pelo botão `+` do `AppShell`, disponível de qualquer rota da residência — não há mais uma rota `/new` para despesa. |
| **Categoria** | Obrigatória, com cinco valores fixos: Alimentação, Contas domésticas, Assinaturas, Lazer e Outros. |
| **Consultar por competência** | Agrupamento por membro, com total por membro e total geral, navegando entre meses. |
| **Editar / excluir** | Apenas os próprios lançamentos, com exclusão lógica (`deletedAt`). |
| **Despesa recorrente** | Marcada para ser recriada na competência seguinte quando o owner fecha o mês. Tela dedicada de gestão. |
| **Fechar / reabrir mês** | O owner fecha a conta do mês; a competência fechada fica somente leitura e a aberta passa a ser a seguinte. |
| **Acertos de pagamento** | No fechamento, o rateio vira **pares** devedor→credor (simplificação de dívidas). O devedor liquida anexando comprovante (compressão no navegador, upload direto ao S3); o credor liquida confirmando o recebimento — sem ordem obrigatória entre os dois. O owner pode dispensar uma linha, com motivo. |

### Relatórios e análise

| Funcionalidade | Descrição |
|---|---|
| **Relatório por categoria** | Quanto foi gasto em cada categoria, em duas abas: **da residência** e **pessoal**. |
| **Comparativo entre meses** | Variação absoluta e percentual entre duas competências, no total e por categoria. |
| **Gráficos** | Composição por categoria e evolução das últimas 6 competências (Recharts). |
| **Rateio entre membros** | Divisão igual do total entre os membros atuais, apontando quem paga e quem recebe. |
| **Média e variação** | Compara a competência atual com a média das 3 anteriores, sinalizando desvios. |
| **Exportar CSV** | Baixa os lançamentos da competência em planilha pronta para o Excel em português. |
| **Compartilhar imagem** | Gera um PNG do resumo do mês (SVG desenhado à mão → canvas) para enviar no grupo da casa. |

---

## 🧰 Stack & Tecnologias

### Front-end (este repositório)

| Camada | Tecnologia |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) + React 19 |
| **Linguagem** | TypeScript (`strict`) |
| **Estilo** | CSS Modules + `modern-css-reset` + `next/font`, sobre design tokens semânticos em `globals.css` (temas por `[data-theme]`) |
| **Validação** | Zod 4 |
| **Gráficos** | Recharts 3 |
| **Ícones** | SVG inline em [`components/layout/Icones.tsx`](src/components/layout/Icones.tsx) — herdam `currentColor` e acompanham o tema |
| **Datas** | date-fns, react-datepicker |
| **Testes** | Jest 30 + Testing Library + `next/jest` (SWC); Cypress 15 para E2E |

### API ([repositório separado](https://github.com/gbrlmzl/sistema-controle-despesas-api))

| Camada | Tecnologia |
|---|---|
| **Runtime** | Node.js 24 + Express 5 |
| **Linguagem** | TypeScript (ESM), executado com `tsx` em dev |
| **ORM / Banco** | Prisma 7 + PostgreSQL (adapter `@prisma/adapter-pg`) |
| **Autenticação** | JWT (`jsonwebtoken`) + refresh token rotativo + Passport (Google OIDC) |
| **Hash de senha** | bcrypt |
| **Validação** | Zod 4 |
| **Testes** | Jest 30 + Supertest (unitários + integração) |

---

## 📁 Estrutura do front-end

```
src/
├── app/
│   ├── layout.tsx                  # Root layout: fontes, ThemeProvider, UserProvider (resolve a sessão)
│   ├── globals.css                 # Design tokens (cores por [data-theme], raios, fontes)
│   ├── page.tsx / Inicio.tsx       # Landing page
│   ├── error.tsx / global-error.tsx
│   ├── api/[...path]/route.ts      # Proxy same-origin do navegador para a API
│   ├── (auth)/                     # Route group das telas SEM sessão (moldura própria, sem navegação)
│   │   ├── login/  register/       # Autenticação
│   │   └── forgot-password/  change-password/
│   ├── profile/                    # Minha conta: perfil, avatares e settings/password/
│   └── dashboard/                  # Área autenticada — layout.tsx envolve tudo no AppShell
│       ├── page.tsx                # Redireciona para /dashboard/residences
│       ├── alerts/                 # Central de notificações
│       └── residences/
│           ├── page.tsx            # Lista + pendências de acesso do usuário
│           ├── new/  join/         # Criar / entrar por código
│           └── [code]/             # Contexto da residência
│               ├── page.tsx        # Painel + Server Actions da residência (*Action.ts)
│               ├── members/        # Gestão de membros (+ requests/: convites e solicitações)
│               ├── settings/       # Renomear, arquivar, regenerar código
│               ├── expenses/       # Consulta por competência e recorrentes (recurring/)
│               ├── settlements/    # Acertos de pagamento (comprovantes, dispensa)
│               └── reports/        # Relatórios e gráficos
├── components/
│   ├── layout/AppShell.tsx         # Casca da área autenticada: rail no desktop, header/tab bar no mobile
│   ├── layout/Icones.tsx           # Ícones SVG inline (+ IconesCategoria.tsx)
│   ├── providers/UserProvider.tsx  # Contexto de "quem está logado" (substitui o useSession)
│   ├── providers/ThemeProvider.tsx # Tema claro/escuro via <html data-theme> + localStorage
│   ├── despesas/                   # CadastrarDespesaModal, SeletorCategoria
│   └── ui/                         # Snackbar, Loading, SinoNotificacoes
├── hooks/                          # useLogin, useLogout, useProfile, useResidencias, useAlertas,
│                                   # useNotificacoes, useCompetenciaAberta, useEsqueciSenha, useRedefinirSenha
├── lib/
│   ├── apiClient.ts                # Cliente HTTP server-side (repassa cookies, retry de refresh)
│   ├── apiClient.client.ts         # Cliente HTTP client-side (refresh deduplicado + cooldown)
│   ├── apiError.ts                 # ApiError + parse do envelope de erro
│   ├── session.ts                  # getCurrentUser() — substitui o auth() do NextAuth
│   ├── setCookie.ts                # Parse de Set-Cookie (usado pelo proxy.ts no Edge)
│   ├── expensesApi.ts / reportsApi.ts / residenceApi.ts / acertosApi.ts
│   └── avatars.ts / residenceCode.ts
├── schemas/                        # Schemas Zod (despesas, residências, usuários)
├── types/                          # Tipos compartilhados (auth, residencia, competencia, acerto, …)
├── utils/                          # dinheiro (centavos), competencia, categorias, csv, resumoImagem,
│                                   # formatarMomento, acerto, comprimirImagem, converterParaPng, linkNotificacao
└── proxy.ts                        # Guarda de rota + renovação de sessão (middleware do Next.js)

public/
├── avatars/                        # avatar-01.svg … avatar-20.svg
└── icons/  fonts/  assets/
```

Cada página é um **Server Component** que busca dados via `lib/*Api.ts` e delega a interação a um Client Component irmão. As mutações são **Server Actions** (arquivos `*Action.ts`), que validam com Zod, chamam a API e disparam `revalidatePath`.

Três áreas, três molduras: a landing tem cabeçalho próprio, `(auth)` não tem navegação nenhuma (quem chega ali ainda não tem sessão) e `/dashboard` + `/profile` compartilham o [`AppShell`](src/components/layout/AppShell.tsx) — que troca de navegação conforme haja ou não um código de residência na URL.

---

## 🗺️ Rotas do front-end

| Rota | Descrição | Protegida |
|---|---|---|
| `/` | Landing page | — |
| `/login` | Login por `username` + senha | só deslogado |
| `/register` | Criação de conta | só deslogado |
| `/forgot-password` | Pede o link de redefinição de senha por email | só deslogado |
| `/change-password` | Redefine a senha a partir do link do email | — (funciona com ou sem sessão, ver F-03 em `docs/plano-recuperacao-de-senha-frontend.md`) |
| `/profile` | Perfil e galeria de avatares | ✅ |
| `/profile/settings/password` | Troca de senha | ✅ |
| `/dashboard` | Redireciona para `/dashboard/residences` | ✅ |
| `/dashboard/alerts` | Histórico de notificações | ✅ |
| `/dashboard/residences` | Lista de residências + pendências | ✅ |
| `/dashboard/residences/new` | Criar residência | ✅ |
| `/dashboard/residences/join` | Entrar por código | ✅ |
| `/dashboard/residences/[code]` | Painel da residência | ✅ |
| `/dashboard/residences/[code]/members` | Gerenciar membros | ✅ |
| `/dashboard/residences/[code]/members/requests` | Convites enviados e solicitações recebidas | ✅ |
| `/dashboard/residences/[code]/settings` | Configurações da residência | ✅ |
| `/dashboard/residences/[code]/expenses` | Consulta por competência | ✅ |
| `/dashboard/residences/[code]/expenses/recurring` | Despesas recorrentes | ✅ |
| `/dashboard/residences/[code]/settlements` | Acertos de pagamento da competência fechada | ✅ |
| `/dashboard/residences/[code]/reports` | Relatórios e gráficos | ✅ |

> As rotas da aplicação viviam sob `/app` (dentro do route group `(auth)`) até a reformulação de UI de 11/08/2026; hoje o prefixo é `/dashboard`, e `(auth)` guarda só as telas de quem ainda não tem sessão. O que o middleware protege é exatamente `/dashboard/:path*` e `/profile/:path*` (ver `matcher` em [`src/proxy.ts`](src/proxy.ts)).

---

## 🔐 Autenticação e sessão

O NextAuth foi removido na V2.0. Hoje a sessão é inteiramente da API, e o front apenas transporta cookies.

### Os dois tokens

| Token | Formato | Vida | Cookie |
|---|---|---|---|
| **Access token** | JWT stateless (HS256) | 15 min | `JWT` — `httpOnly`, `sameSite: lax` |
| **Refresh token** | Valor opaco aleatório (40 bytes) | 7 dias | `REFRESH` — `httpOnly`, `sameSite: strict` |

O refresh token **não é um JWT de propósito**: ele não carrega claim nenhuma, e o banco é a única fonte de verdade sobre validade. Só o **hash SHA-256** é guardado, nunca o valor em texto puro.

### Rotação com detecção de reuso

Cada refresh gera um token novo e revoga o anterior, todos agrupados por um `familyId` (a cadeia de rotação de um mesmo login). Se um token **já revogado** for apresentado de novo, é sinal de roubo: a **família inteira é revogada**, forçando login novo. Ver `rotateRefreshToken` no `authService` da API.

### Como o front participa

```
1. proxy.ts (Edge)     → decodifica o exp do JWT (sem validar assinatura); se estiver
                         perto de expirar e houver REFRESH, chama POST /auth/refresh
                         ANTES do render e propaga os cookies novos
2. layout.tsx          → getCurrentUser() chama GET /users/me a cada render
3. apiClient           → em 401, tenta POST /auth/refresh uma vez e repete a chamada
```

Três detalhes que valem atenção:

- **O `proxy.ts` não é autorização.** Ele roda no Edge Runtime, onde a biblioteca de JWT da API não funciona, então só lê o `exp` do payload — uma heurística de "provavelmente expirado", nunca uma validação. A autorização de verdade é sempre da API, a cada chamada: um cookie presente mas inválido passa pelo proxy e falha depois. Ele é, porém, **o único ponto do fluxo que roda antes do render e onde o Next.js deixa escrever cookie de fato** — por isso a renovação proativa mora ali, e os cookies renovados são gravados tanto na resposta quanto no header `Cookie` do próprio request (o `cookies()` de `next/headers` lê o request, não o `Set-Cookie` do middleware).
- **O `apiClient` do servidor repassa os cookies na mão** e reaplica os `Set-Cookie` da API via `next/headers`, porque nada disso é automático em `fetch` server-to-server.
- **O `apiClient.client` deduplica o refresh**: se duas chamadas tomam 401 ao mesmo tempo, a segunda espera a promise que a primeira já disparou. Há ainda um cooldown de 30s após uma falha, para não entrar em loop.

---

## 🔌 API REST

Base local: `http://localhost:8080`. Do front, tudo passa por `/api/*` — pelo Route Handler [`src/app/api/[...path]/route.ts`](<src/app/api/[...path]/route.ts>) quando a chamada nasce no navegador, e direto pelo `apiClient` quando nasce em Server Component ou Server Action. Erros sempre respondem `{ message }` com o status apropriado.

### Autenticação — `/auth` (público)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cria a conta e já estabelece a sessão |
| `POST` | `/auth/login` | Login por `username` + `password` |
| `POST` | `/auth/refresh` | Rotaciona o refresh token e emite novo access token |
| `POST` | `/auth/logout` | Revoga o refresh token e limpa os cookies |
| `POST` | `/auth/forgot-password` | Dispara o email com o link de redefinição (sempre `200`, anti-enumeração) |
| `POST` | `/auth/reset-password/verify` | Valida o token do link antes de mostrar o formulário |
| `POST` | `/auth/reset-password` | Redefine a senha pelo token — **sem** abrir sessão |
| `GET` | `/auth/google` | Início do OAuth _(só se o Google estiver configurado)_ |
| `GET` | `/auth/google/callback` | Callback do OAuth |

### Usuários — `/users` 🔒

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/users/me` | Usuário da sessão |
| `PATCH` | `/users/me` | Atualiza nome e/ou avatar |
| `PATCH` | `/users/me/password` | Troca a senha (valida a atual) |

### Residências — `/residences` 🔒

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/residences` | Residências do usuário + pendências de acesso |
| `POST` | `/residences` | Cria residência (gera o código) |
| `GET` | `/residences/:code` | Detalhe + convites enviados + solicitações pendentes |
| `PATCH` | `/residences/:code` | Renomeia / arquiva / desarquiva _(owner)_ |
| `POST` | `/residences/:code/code` | Regenera o código _(owner)_ |
| `POST` | `/residences/:code/invites` | Convida por `username` _(owner)_ |
| `PUT` | `/residences/:code/owner` | Transfere a propriedade _(owner)_ |
| `DELETE` | `/residences/:code/members/me` | Sair da residência |
| `DELETE` | `/residences/:code/members/:userId` | Remove membro _(owner)_ |
| `POST` | `/residences/join-requests` | Solicita entrada por código |
| `PATCH` | `/residences/join-requests/:id` | Aceita / recusa solicitação _(owner)_ |
| `DELETE` | `/residences/join-requests/:id` | Cancela a própria solicitação |
| `PATCH` | `/residences/invites/:id` | Aceita / recusa convite recebido |
| `DELETE` | `/residences/invites/:id` | Cancela convite enviado _(owner)_ |

### Despesas — `/residences/:code/expenses` 🔒

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/expenses?month=&year=` | Despesas da competência, agrupadas por membro _(sem query: a competência aberta)_. Traz também o bloco `settlement` com "o meu lado" nos acertos |
| `GET` | `/expenses/competencies` | Competências disponíveis para navegação no seletor |
| `POST` | `/expenses` | Lança despesa na competência aberta |
| `PATCH` | `/expenses/:expenseId` | Edita a própria despesa |
| `DELETE` | `/expenses/:expenseId` | Exclui (lógico) a própria despesa |
| `GET` | `/expenses/recurring` | Recorrentes do próprio usuário |
| `DELETE` | `/expenses/:expenseId/recurrence` | Para a recorrência sem excluir o lançamento |
| `POST` | `/expenses/month-closures` | Fecha o mês _(owner)_ |
| `DELETE` | `/expenses/month-closures/:period` | Reabre o mês _(owner)_ |

### Acertos de pagamento — `/residences/:code/closures/:period` 🔒

`:period` é a competência no formato `AAAAMM`. Só existe para competência **fechada**: período aberto (ou usuário que não é membro) responde `404`, e o front trata como `notFound()`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/settlements` | Pares devedor→credor da competência, com totais, comprovantes e o que o usuário pode fazer (`canAct` / `canUpload`) |
| `POST` | `/settlements/:id/confirm` | O credor confirma o recebimento |
| `POST` | `/settlements/:id/waive` | O owner dispensa a linha, com motivo |
| `POST` | `/settlements/:id/receipts` | Pede a URL pré-assinada de upload (envia `contentType`, `sizeInBytes`, `originalName`) |
| `POST` | `/settlements/:id/receipts/:receiptId/complete` | Confirma o upload concluído e marca a linha como paga |
| `GET` | `/receipts/:receiptId/url` | URL temporária para visualizar um comprovante |

O arquivo em si **não passa pela API**: o navegador comprime a imagem (PDF passa direto), pede a URL pré-assinada, faz `POST` do form direto ao S3 e só então chama `/complete`.

### Relatórios e notificações 🔒

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/residences/:code/reports?month=&year=&tab=` | Relatório da competência. `tab` = `residence` (padrão) ou `personal` |
| `GET` | `/notifications` | Notificações do usuário (paginadas) |
| `PATCH` | `/notifications` | Marca notificações como lidas |
| `GET` | `/health` | Health check (público) |

---

## 🗄️ Modelo de dados

PostgreSQL via Prisma. O schema vive na API (`prisma/schema.prisma`).

```
User ──< UserAuthProvider          (provedores de login: local | google)
 │  └──< RefreshToken              (sessões, com rotação por familyId)
 │
 ├──< Membership >── Residence     (N:N com papel OWNER | MEMBER)
 ├──< Invite      >── Residence    (convite: de dentro para fora)
 ├──< JoinRequest >── Residence    (solicitação: de fora para dentro)
 ├──< Expense     >── Residence    (lançamento numa competência)
 ├──< MonthClosure>── Residence    (fechamento do mês)
 ├──< Notification                 (avisos genéricos)
 └──< JoinAttempt                  (rate limit de entrada por código)
```

| Model | Campos-chave | Observações |
|---|---|---|
| **User** | `name`, `email` (único), `username` (único), `password?`, `profilePic?` | `password` nulo em contas só-Google. `username` é o identificador **público** e o login. |
| **RefreshToken** | `tokenHash` (único), `familyId`, `expiresAt`, `revokedAt?` | Nunca guarda o token em texto puro. |
| **Residence** | `name`, `code` (único), `ownerId`, `archivedAt?` | Arquivada = somente leitura. |
| **Membership** | `userId` + `residenceId` (único), `role` | `OWNER` \| `MEMBER`. |
| **Invite** / **JoinRequest** | `status`, `expiresAt` (convite), `respondedAt?` | `PENDING` \| `ACCEPTED` \| `DECLINED` \| `CANCELLED` \| `EXPIRED`. |
| **Expense** | `name`, **`valueInCents`**, `category`, `month`, `year`, `isRecurring`, `deletedAt?` | Valor **em centavos**: ponto flutuante acumularia erro na soma e o rateio depende de totais exatos. |
| **MonthClosure** | `residenceId` + `year` + `month` (único), `closedById` | Fechamento da conta do mês. |
| **Notification** | `type`, `title`, `message`, `linkTo?`, `readAt?` | Catálogo extensível; qualquer área publica aqui. |
| **JoinAttempt** | `userId`, `createdAt` | Contador persistido, para sobreviver a restart e múltiplas instâncias. |

**Enums:** `MembershipRole`, `AccessStatus`, `ExpenseCategory` (`ALIMENTACAO`, `DOMESTICAS`, `ASSINATURAS`, `LAZER`, `OUTROS`) e `NotificationType` (convite recebido, solicitação recebida/aceita/recusada, membro removido, propriedade transferida, mês fechado).

**Acertos.** O fechamento do mês passou a gerar também as linhas de acerto, penduradas no `MonthClosure`. O schema fica na API; o contrato que este repositório consome está tipado em [`src/types/acerto.ts`](src/types/acerto.ts):

- Uma linha por **par** devedor→credor (nunca por pessoa: quem deve para dois membros aparece em duas linhas), com `payer`, `receiver`, `amountInCents`, `paidAt`, `confirmedAt`, `waivedAt` e `waiveReason`.
- Status da linha: `PENDING` → `AWAITING_CONFIRMATION` → `SETTLED`, ou `WAIVED` quando o owner dispensa. O fechamento inteiro tem o seu próprio status agregado (`AWAITING_PAYMENT`, `AWAITING_CONFIRMATION`, `SETTLED`).
- Cada linha guarda os **comprovantes** enviados (`contentType`, `sizeInBytes`, `originalName`, `uploadedAt`, `uploadedByName`) — o binário fica no S3, não no banco.
- Fechamento antigo, anterior à funcionalidade, devolve a lista vazia em vez de `404`.

---

## 📋 Regras de negócio

As regras (`RN-XXX`) são catalogadas em [`docs/release-v2.0-requisitos.md`](docs/release-v2.0-requisitos.md) e referenciadas em comentários no código da API. As mais estruturantes:

### Competência (mês/ano)

- **A competência aberta é o mês corrente**; se o owner já o fechou, passa a ser o seguinte (RN-020).
- Toda despesa cai **sempre na competência aberta** — nunca numa escolhida pelo cliente.
- Reabrir um mês passado o destrava para edição, mas **não muda** onde os novos lançamentos caem.

### Acesso e visibilidade

- Só membros veem uma residência. Quem não é membro recebe **404**, igual a residência inexistente (RN-009 / RN-010) — não dá para descobrir se um código existe.
- Uma solicitação recusada só pode ser refeita **depois de uma hora** (RN-013).
- Convites expiram em **7 dias** (RN-015).
- **10 tentativas** malsucedidas de código em 15 minutos bloqueiam por 15 minutos, contadas **por usuário autenticado** (RN-049 / RN-051).
- Regenerar o código derruba as solicitações pendentes (nasceram do código antigo), mas **não toca nos membros atuais** (RN-047 / RN-048).

### Propriedade e saída

- O owner **não pode sair** sem antes transferir a propriedade — a residência nunca fica sem dono (RN-021 / RN-017).
- A transferência acontece em **transação única**, para nunca haver zero ou dois owners.
- Quem sai (ou é removido) **leva junto os lançamentos da competência aberta** (RN-022 / RN-026), para o rateio não ficar inflado por gastos de quem não está mais na casa.

### Rateio e relatórios

- Divisão **igual** do total pelo número de membros atuais (FEAT-029).
- A sobra da divisão em centavos é distribuída **de um em um centavo** entre os primeiros participantes (RN-066) — assim a soma das cotas bate com o total e a soma dos saldos dá exatamente zero.
- Lançamentos excluídos ficam de fora do relatório (RN-057).
- O gráfico de evolução mostra as **últimas 6 competências** (RN-062); a média usa as **3 anteriores** (RN-068).
- A aba pessoal olha **só para a residência atual**, nunca soma as outras (RN-060).

---

## 🧪 Testes

### Front-end

Jest 30 + Testing Library, com a transformação via **`next/jest`** — que usa o mesmo SWC do Next.js, sem Babel. A configuração já cobre CSS Modules, imagens, `next/font` e o alias `@/*`.

```bash
npm test
```

| Arquivo | Papel |
|---|---|
| [`jest.config.ts`](jest.config.ts) | Config via `nextJest({ dir })` + `moduleNameMapper` do alias e `testEnvironment: jsdom` |
| [`jest.setup.ts`](jest.setup.ts) | Importa `@testing-library/jest-dom` |
| `.env.test` | Necessário porque o Next.js **não carrega `.env.local` em `NODE_ENV=test`**, e o `next.config.ts` exige `API_URL` |

> Testes ficam junto do código, em arquivos `*.test.tsx` / `*.spec.tsx` ou dentro de `__tests__/`.

O plano de ampliação de cobertura — o que vale testar e em que ordem — está em [`docs/plano-cobertura-testes.md`](docs/plano-cobertura-testes.md); o catálogo de casos, em [`docs/backlog-e-casos-de-teste.md`](docs/backlog-e-casos-de-teste.md).

### E2E (Cypress)

Os specs vivem em [`cypress/e2e/`](cypress/e2e) e rodam **contra um build de produção** na porta `3100`, não contra o dev server: em dev com Turbopack a hidratação de algumas rotas às vezes não termina a tempo, e cliques do Cypress passam silenciosamente sem efeito. A API precisa estar no ar.

```bash
npm run test:e2e        # build + next start -p 3100 + cypress run
npm run test:e2e:fast   # o mesmo, reaproveitando o build existente
npm run test:e2e:open   # abre a interface do Cypress
```

| Spec | Fluxo coberto |
|---|---|
| `criar-conta.cy.ts` / `recuperar-senha.cy.ts` | Cadastro e recuperação de senha |
| `perfil-e-logout.cy.ts` | Perfil, avatares e saída da sessão |
| `criar-residencia.cy.ts` / `entrar-residencia-codigo.cy.ts` | Criação e entrada por código |
| `convite-membro.cy.ts` / `gerenciar-membros.cy.ts` | Convites, solicitações e gestão de membros |
| `painel-residencia.cy.ts` / `configuracoes-residencia.cy.ts` | Painel e configurações da residência |
| `lancar-despesa.cy.ts` / `editar-excluir-despesa.cy.ts` / `despesa-recorrente.cy.ts` | Ciclo de vida das despesas |
| `fechar-reabrir-mes.cy.ts` / `acertos-de-pagamento.cy.ts` | Fechamento do mês e acertos |
| `relatorios-residencia.cy.ts` / `central-notificacoes.cy.ts` | Relatórios e central de notificações |

> No CI, esses specs **não rodam neste repositório** — quem os executa é o repositório de deploy, contra a stack completa. Ver [Onde o E2E roda](#onde-o-e2e-roda).

### API

Jest + Supertest, separados em `tests/unit` (services e schemas) e `tests/integration` (rotas de ponta a ponta).

```bash
npm test
```

---

## 🚀 Como rodar

São **dois processos** — a API precisa estar no ar para o front funcionar.

> **Caminho mais curto:** o repositório da API tem `docker-compose.yml` próprio, que sobe o Postgres, aplica as migrations e serve a API de uma vez. Com ele no ar, pule direto para o passo 3. O passo a passo manual abaixo continua válido para quem quer rodar a API fora de container. Para subir o sistema **inteiro** (front + API + banco) num comando só, use o [`sistema-controle-despesas-deploy`](https://github.com/gbrlmzl/sistema-controle-despesas-deploy).

### 1. Banco de dados

Um PostgreSQL acessível. A forma mais rápida:

```bash
docker run --name cronos-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sistema_controle_despesas -p 5432:5432 -d postgres:17-alpine
```

### 2. API

```bash
cd ../sistema-controle-despesas-api
npm install
cp .env.example .env    # preencha DATABASE_URL e JWT_SECRET
npx prisma migrate dev  # aplica as migrations e gera o client
npm run dev             # sobe em http://localhost:8080
```

> `JWT_SECRET` precisa de no mínimo 32 caracteres. Gere um com:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Front-end

```bash
npm install
cp .env.example .env.local   # ajuste API_URL para a porta onde a API subiu
npm run dev                  # sobe em http://localhost:3000
```

### Scripts

| Projeto | Script | Ação |
|---|---|---|
| **Front** | `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| | `npm run build` / `npm start` | Build e servidor de produção |
| | `npm run start:e2e` | Servidor de produção na porta `3100`, usada pelo Cypress |
| | `npm run lint` | ESLint |
| | `npm test` | Jest |
| | `npm run test:watch` | Jest em modo watch |
| | `npm run test:coverage` | Jest com relatório de cobertura (o que o CI roda) |
| | `npm run test:low-cost` | Jest em série (`--runInBand`), para máquina com pouca memória |
| | `npm run test:e2e` / `test:e2e:fast` / `test:e2e:open` | Cypress contra o build de produção (ver "Testes") |
| | `npm run cypress:run` / `cypress:open` | Cypress avulso, contra um servidor já no ar |
| **API** | `npm run dev` | `tsx watch` em `src/server.ts` |
| | `npm run build` / `npm start` | Compila para `dist/` e executa |
| | `npm test` | Jest (unitários + integração) |
| | `npm run prisma:generate` | Gera o Prisma Client |

---

## 🔑 Variáveis de ambiente

### Front-end

| Variável | Descrição |
|---|---|
| `API_URL` | URL base da API. Lida em **runtime**, a cada requisição, pelos três consumidores: o Route Handler [`src/app/api/[...path]/route.ts`](<src/app/api/[...path]/route.ts>) (chamadas do navegador), [`src/lib/apiClient.ts`](src/lib/apiClient.ts) (Server Components/Actions) e [`src/proxy.ts`](src/proxy.ts) (guarda de rota). **Obrigatória** — os três lançam erro na primeira chamada se ela estiver vazia. |

Definida em `.env.local` (desenvolvimento) e `.env.test` (testes, versionado por não conter segredo).

**Em produção**, `API_URL` é lida do **ambiente do container em runtime** — trocar de API alvo é só mudar a variável e reiniciar o processo, sem rebuild. (Até 21/08/2026, o caminho do navegador passava por um `rewrite` do Next resolvido em **build-time**, congelado em `routes-manifest.json`; foi a causa de uma indisponibilidade em produção, corrigida trocando o rewrite pelo Route Handler acima.) No ECS, front e API rodam em **tasks separadas** (`cronos-front` e `cronos-app`, network mode `bridge`) e se acham pelo gateway da bridge do Docker (`172.17.0.1`), mapeado para o nome `api` via `extraHosts` na task definition do front — então essa variável deve valer:

```
API_URL=http://api:8080
```

**Detalhe de build que sobrevive à mudança acima:** o `next build` ainda precisa de `API_URL` **presente** (não necessariamente correta) durante a etapa "Collecting page data" — o Next avalia o módulo de cada rota nessa etapa, e o Route Handler acima (como `apiClient.ts` e `proxy.ts`) lança erro se a variável estiver vazia. É só um guard de "não suba sem isso"; o valor usado no build não influencia mais o comportamento da imagem publicada, então o [`Dockerfile`](Dockerfile) e o [`ci.yml`](.github/workflows/ci.yml) continuam passando um placeholder via `--build-arg`, mas a antiga **Repository Variable** `API_URL` do GitHub deixou de ser necessária.

Esse valor é uma constante da arquitetura (o `extraHosts` garante que `api` resolva dentro do container em qualquer deploy), não algo que varia por ambiente.

> ⚠️ **`API_URL` precisa existir no ambiente do container em runtime**, não só como `--build-arg`. Os três consumidores (Route Handler, `apiClient.ts`, `proxy.ts`) lançam `Error: Variável de ambiente API_URL não configurada.` na primeira chamada se ela estiver ausente — e como `proxy.ts` roda a cada requisição para renovar a sessão, essa falha vira **toda página retornando 500**. Na task definition do ECS (repositório de deploy), o container do front precisa ter `API_URL=http://api:8080` configurada como variável de ambiente de runtime.

### API

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | — | **Obrigatória.** Conexão do PostgreSQL. |
| `JWT_SECRET` | — | **Obrigatória.** Mínimo de 32 caracteres. |
| `PORT` | `8080` | Porta do servidor. |
| `NODE_ENV` | `development` | `development` \| `test` \| `production`. |
| `FRONTEND_URL` | `http://localhost:3000` | Origem do front (CORS com credenciais + redirect do OAuth). |
| `JWT_EXPIRES_IN` | `15m` | Vida do access token. |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Vida do refresh token. |
| `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET`<br>`GOOGLE_CALLBACK_URL`<br>`COOKIE_SESSION_SECRET` | — | Login com Google. **Opcionais, mas tudo ou nada**: ou as quatro são preenchidas, ou nenhuma. Sem elas a API sobe normalmente só com login por credenciais. |

As variáveis são validadas com Zod na subida ([`src/config/env.ts`](https://github.com/gbrlmzl/sistema-controle-despesas-api/blob/main/src/config/env.ts)): se algo estiver faltando ou malformado, a API falha imediatamente com a mensagem do erro, em vez de quebrar mais tarde.

---

## 📐 Convenções de código

- **CSS Modules por componente** (`*.module.css`), com variáveis globais em `globals.css` e fontes injetadas via `next/font` como CSS vars.
- **Design tokens semânticos, não literais** (`--surface`, `--ink`, `--accent` — nunca `--azul`). Os tokens de cor moram em blocos por tema (`:root[data-theme="…"]`), então trocar de tema é reescrever esse bloco, sem tocar em componente nenhum.
- **Ícones são componentes SVG inline** ([`components/layout/Icones.tsx`](src/components/layout/Icones.tsx)), não `<img>` de `public/icons`: herdam `currentColor`, acompanham o tema e não custam uma requisição cada.
- **Server Components buscam, Client Components interagem.** A página resolve os dados e passa para um componente cliente irmão.
- **Mutação é Server Action.** Arquivos `*Action.ts` com `'use server'`, retornando o `ActionState` comum (`{ success, message, data? }`) e chamando `revalidatePath`.
- **Zod em toda entrada**, tanto nas Server Actions quanto nas rotas da API.
- **Dinheiro em centavos** (inteiro) de ponta a ponta; a formatação para exibição fica em `utils/dinheiro.ts`.
- **Exclusão lógica** em `Expense` (`deletedAt`) — leituras sempre filtram `deletedAt: null`.
- **Comentários explicam o porquê, não o quê.** O código da API é denso em comentários que justificam decisões e citam a regra de negócio correspondente.
- Models, rotas e campos em **inglês**; UI, hooks, schemas e mensagens em **português**.

---

## 🐳 Build de produção (Docker)

A imagem de produção ([`Dockerfile`](Dockerfile)) é multi-stage e usa `output: 'standalone'` do Next.js: o build já rastreia e copia só o `server.js` gerado e o subconjunto podado de `node_modules` usado em runtime, em vez do `node_modules` de produção inteiro. Isso derruba o **payload da aplicação** de >1 GB para ~47 MB (medido localmente). A imagem final fecha em ~390 MB no total — o restante é a base `node:24-bookworm-slim` (glibc, necessária pelos binários prebuilt do SWC), que já não muda com o `standalone`. Isso importa porque o destino de deploy (instância `t4g.small`) tem **2 GB de RAM**, divididos com o Postgres (limite de 384 MB) e a API (448 MB).

O entrypoint é `node server.js` (não `npm start`/`next start`) — o `server.js` é gerado pelo próprio Next dentro de `.next/standalone`. O endereço da API **não** fica embutido nele: o Route Handler que faz proxy de `/api/*` lê `API_URL` do ambiente do container a cada requisição (ver seção anterior), então a mesma imagem serve qualquer ambiente — só muda a variável passada na hora de rodar o container.

**A imagem publicada no GHCR é `linux/arm64` puro** ([`ci.yml`](.github/workflows/ci.yml), job `docker-publish`), porque o único destino de deploy hoje é uma instância Graviton (ARM64). Isso significa que:

- Rodar `docker pull ghcr.io/gbrlmzl/sistema-controle-despesas-front` numa máquina x86 (Intel/AMD) só funciona via emulação (QEMU/Rosetta), mais lento.
- Para desenvolvimento local, isso não afeta nada — [`docker-compose.yml`](docker-compose.yml) builda a partir do `Dockerfile.dev` na sua própria arquitetura, não consome a imagem do GHCR.
- Buildar a imagem de produção localmente funciona normalmente em qualquer arquitetura (`docker build --build-arg API_URL=... .`); só a imagem *publicada* é arm64-only.

### Onde o E2E roda

O CI **deste** repositório cobre lint, testes unitários (Jest) e build de produção — os specs do Cypress vivem aqui (`cypress/`), mas não rodam aqui. Depois de publicar a imagem, o job `dispatch` do [`ci.yml`](.github/workflows/ci.yml) avisa o [`sistema-controle-despesas-deploy`](https://github.com/gbrlmzl/sistema-controle-despesas-deploy), que sobe a stack completa (front + API + Postgres) e roda os specs contra ela. Se passarem, aquele repositório re-taggeia **esta mesma imagem** como `:stable` — build once, promote everywhere. Localmente, `npm run test:e2e` continua funcionando contra uma API no host.

---

## 📚 Documentação complementar

| Documento | Conteúdo |
|---|---|
| [`docs/release-v2.0-requisitos.md`](docs/release-v2.0-requisitos.md) | Backlog completo, estórias de usuário e cenários BDD da V2.0 |
| [`docs/decisao-arquitetura-frontend.md`](docs/decisao-arquitetura-frontend.md) | Por que o Next.js foi mantido em vez de virar SPA com Vite |
| [`docs/plano-api-node-express.md`](docs/plano-api-node-express.md) | Plano de extração da API para Node/Express |
| [`docs/plano-integracao-frontend-api.md`](docs/plano-integracao-frontend-api.md) | Plano de integração do front com a API |
| [`docs/estrategia-tratamento-erros-api.md`](docs/estrategia-tratamento-erros-api.md) | Estratégia de tratamento de erros nas chamadas à API |
| [`docs/migracao-typescript.md`](docs/migracao-typescript.md) | Registro da migração de JavaScript para TypeScript |
| [`docs/decisao-sincronizacao-usuario-pos-acao.md`](docs/decisao-sincronizacao-usuario-pos-acao.md) | Como o usuário do contexto é sincronizado após login/cadastro/logout/perfil, e por que |
| [`docs/backlog-e-casos-de-teste.md`](docs/backlog-e-casos-de-teste.md) | Backlog de funcionalidades com cobertura de teste, e documentação de cada caso de teste do front-end |
| [`docs/plano-cobertura-testes.md`](docs/plano-cobertura-testes.md) | Sequência de trabalho para elevar a cobertura, priorizando Server Actions e hooks |
| [`docs/plano-recuperacao-de-senha-frontend.md`](docs/plano-recuperacao-de-senha-frontend.md) | Plano do fluxo de recuperação de senha no front |
| [`docs/plano-registro-de-pagamentos-frontend.md`](docs/plano-registro-de-pagamentos-frontend.md) | Plano do front para o registro e rastreio de pagamentos (base dos acertos) |
| [`docs/funcionalidade-pagamentos.md`](docs/funcionalidade-pagamentos.md) | Proposta de evolução dos pagamentos — **em discussão, nada implementado** |
| [`docs/relatorios/RELATORIO_V1.1.md`](docs/relatorios/RELATORIO_V1.1.md) | Relatório da versão anterior |

---

## ⚠️ Pendências conhecidas

- **O `docker-compose.yml` deste repositório só sobe o front** — e isso é uma decisão, não uma limitação: a API tem compose próprio, que sobe ela junto com o Postgres dela. Ver "Como rodar" acima para as três formas de subir o sistema.
- **Épico de administração e auditoria** (papel ADMIN, trilha de auditoria, monitoramento de acessos) está fora do escopo da V2.0 e não iniciado.

### Pendências de produção (AWS)

Levantadas durante o incidente de 20-21/08/2026.

- ~~O rewrite `/api/*` continua congelado em build-time.~~ **Resolvido em código**: o antigo `rewrite` de `next.config.ts` deu lugar ao Route Handler [`src/app/api/[...path]/route.ts`](<src/app/api/[...path]/route.ts>), que lê `API_URL` em runtime a cada requisição — a mesma imagem passa a servir qualquer ambiente, sem rebuild. Falta **validar via e2e e fazer o deploy**; até lá, produção continua rodando a correção mínima aplicada em 21/08/2026.
- **Google OAuth e SMTP dependem de variáveis na task `cronos-app`.** O código dos dois está pronto nos dois repositórios; falta preencher os dois grupos de variáveis de ambiente da API. O `env.ts` trata cada grupo como "tudo ou nada" — preencher pela metade **impede a API de subir**. Enquanto o grupo do OAuth estiver ausente, `/auth/google` nem é registrada no Express e o botão "Continuar com Google" leva a um 404; enquanto o grupo SMTP estiver ausente, a recuperação de senha completa o fluxo **sem nunca enviar o email**. Nada disso é configurável neste repositório: as 4 + 5 variáveis moram na task definition da API, no [repositório de deploy](https://github.com/gbrlmzl/sistema-controle-despesas-deploy).
- ~~A porta da API (`3001`) difere da do front (`3000`) em um dígito.~~ **Resolvido**: a API foi padronizada em **`8080`**, e o repositório inteiro passou a refletir isso — `.env.example`, `.env.test`, o placeholder do [`Dockerfile`](Dockerfile), o do [`ci.yml`](.github/workflows/ci.yml), o [`docker-compose.yml`](docker-compose.yml) e esta documentação. Em produção, isso implica `API_URL=http://api:8080` na task definition do front e `PORT=8080` na da API — as duas moram no [repositório de deploy](https://github.com/gbrlmzl/sistema-controle-despesas-deploy), então **confira se as duas foram atualizadas junto**; mudar uma só derruba a integração.

---

_Projeto de [github.com/gbrlmzl](https://github.com/gbrlmzl) — front-end e [API](https://github.com/gbrlmzl/sistema-controle-despesas-api)._
