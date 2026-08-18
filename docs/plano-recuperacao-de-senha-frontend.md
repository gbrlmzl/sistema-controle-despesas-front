# Plano: recuperação de senha — front-end

> **Status:** documento de decisão. Nada foi implementado. Contraparte do
> `docs/plano-recuperacao-de-senha.md` do repositório **sistema-controle-despesas-api**, que define
> o contrato dos três endpoints e as decisões `D-xx` citadas aqui.
>
> **Divisão de trabalho:**
> - **[Parte A](#parte-a--sua-parte)** — o que **você** faz. É curta de propósito: este repositório
>   não ganha variável de ambiente nem credencial nenhuma. A configuração de email inteira (senha de
>   app do Google, SMTP) mora no repositório da API.
> - **[Parte B](#parte-b--execução-pelo-sonnet-5)** — o roteiro de implementação para o **Sonnet 5**,
>   fase a fase, com critério de aceite e comando de verificação em cada uma.
>
> **Dependência:** as Fases 1 e 2 podem ser escritas e testadas (Jest) **antes** de a API existir —
> os testes de componente mockam `apiFetchClient`. Só a Fase 4 (Cypress) exige a API no ar com a
> feature pronta.

---

## 1. Contrato da API (fonte da verdade)

Três endpoints, todos sem autenticação, todos com o token **no corpo** e nunca na URL (decisão D-10
do plano da API: a API loga a URL completa de toda requisição em produção com `morgan('combined')`,
e um token na rota viraria credencial válida gravada em texto puro no log de acesso).

| Método | Rota | Corpo | Resposta |
| :---- | :---- | :---- | :---- |
| `POST` | `/auth/forgot-password` | `{ email }` | **Sempre** `200 { message }` |
| `POST` | `/auth/reset-password/verify` | `{ token }` | `200 { valid: true }` ou `400 { message }` |
| `POST` | `/auth/reset-password` | `{ token, newPassword, confirmNewPassword }` | `200 { message }`, **sem `Set-Cookie`** |

Três comportamentos da API que mudam o que o front pode fazer:

1. **`/auth/forgot-password` responde `200` mesmo para email inexistente** (D-03, anti-enumeração).
   A tela **não pode** tentar inferir se a conta existe, nem mudar o texto conforme o caso. O único
   `400` possível é formato de email inválido — e esse a gente evita validando antes de chamar.
2. **Redefinir a senha não abre sessão** (D-06). A resposta não traz cookie nenhum: o usuário vai
   para `/login` e digita a senha nova. Não espere `AuthUser` no corpo, não chame `setUser`.
3. **O link do email aponta para `FRONTEND_URL + PASSWORD_RESET_PATH + ?token=...`**, com
   `PASSWORD_RESET_PATH` default `/change-password`. O nome da rota deste repositório e o valor
   daquela variável **têm que bater** — ver Parte A.

O limite de requisições da API devolve `429` com `{ message }`, que o `ApiError` já carrega. `429`
aqui é por IP, não por conta, então exibir a mensagem não vaza nada.

---

## 2. O que já existe neste repositório e que este plano reaproveita

Nenhuma peça de infraestrutura nova é necessária. Tudo abaixo já está pronto e testado:

| O que já existe | Onde | Uso aqui |
| :---- | :---- | :---- |
| Chamada client-side à API, com rewrite same-origin `/api/*` | [apiClient.client.ts](src/lib/apiClient.client.ts), [next.config.ts](next.config.ts) | As três chamadas novas (ver F-01) |
| `ApiError` com `status` e `message` | [apiError.ts](src/lib/apiError.ts) | Tratamento de erro nos dois formulários |
| Hook de formulário com `useActionState` | [useLogin.ts](src/hooks/useLogin.ts) | Molde exato dos dois hooks novos |
| Moldura visual de login/cadastro | [(auth)/layout.tsx](src/app/(auth)/layout.tsx) | As duas telas entram no mesmo grupo de rota |
| CSS compartilhado dos formulários de auth | [authForm.module.css](src/app/(auth)/authForm.module.css) | Reuso direto; só 3 classes novas |
| Lista de condições de senha (✓/✗ ao vivo) | `RegisterForm.tsx` + `.condicoes`/`.condicao`/`.condicaoAtendida` | Reuso direto na tela de redefinição |
| Guarda de rota e renovação de sessão | [proxy.ts](src/proxy.ts) | Ajuste pontual — e uma armadilha, ver F-03 |
| Logout best-effort que limpa contexto e cookies | [useLogout.ts](src/hooks/useLogout.ts) | Resolve o cookie velho pós-reset (F-09) |
| `ActionState<T>` | [types/actions.ts](src/types/actions.ts) | Retorno dos dois hooks |

---

## 3. Decisões de arquitetura

### F-01 — Chamadas no client (`apiFetchClient`), não Server Action

O repositório tem os dois padrões: `registerAction`/`changePasswordAction` são Server Actions
(`apiFetch`, server-only), e `useLogin` chama direto do client (`apiFetchClient`).

Aqui o certo é o **client**, pelo mesmo motivo que o `useLogin` já documenta: não há cookie para
repassar manualmente. E neste fluxo é ainda mais claro — a API **não devolve cookie nenhum** (D-06).
Uma Server Action adicionaria um salto pelo servidor Next para nada.

Passe `skipAuthRetry: true`, como o `useLogin` faz: um `401`/`400` nessas rotas é resposta legítima
do endpoint, não "sessão expirada", e tentar renovar sessão seria ruído.

### F-02 — As duas telas entram no grupo de rota `(auth)`

`src/app/(auth)/forgot-password/` e `src/app/(auth)/change-password/`. Elas herdam a moldura de
apresentação do `(auth)/layout.tsx` (o painel do Cronos à esquerda no desktop, só o formulário no
mobile) e reusam o `authForm.module.css`. São a mesma família de telas do login e do cadastro; ficar
fora do grupo faria a recuperação de senha parecer outro produto.

### F-03 — `/forgot-password` é "somente deslogado"; `/change-password` **não** entra no proxy ⚠️

Esta é a decisão que mais fácil se erra por simetria.

- **`/forgot-password`** entra no `matcher` e no `ROTAS_SOMENTE_DESLOGADO` do
  [proxy.ts](src/proxy.ts), junto de `/login` e `/register`: quem já tem sessão não tem o que fazer
  ali, e é o mesmo tratamento que as outras telas de auth já recebem.
- **`/change-password` não entra em lugar nenhum do proxy.** Colocá-la em
  `ROTAS_SOMENTE_DESLOGADO` "por consistência" quebraria o caso real mais provável: o usuário está
  logado no navegador (a sessão dura 7 dias), pediu a redefinição porque esqueceu a senha para
  entrar no celular, clica no link do email — e o proxy o chuta para `/`, sem explicação e sem
  jeito de redefinir nada. O link do email precisa funcionar **independente de haver sessão**.

### F-04 — A confirmação é um estado do componente, não uma rota

Depois de enviar o email, a tela de `/forgot-password` troca o formulário pela mensagem de
confirmação **no mesmo componente**, como o `ChangePasswordForm` já faz com `if (state?.success)`.

Uma rota `/forgot-password/enviado` seria alcançável por URL direta, mostrando "email enviado" para
quem nunca pediu nada. Um estado local não tem esse problema, e a navegação de volta funciona sozinha.

### F-05 — Validação de senha calculada no render, sem `useEffect`

O `RegisterForm.tsx` calcula `atLeast8Chars`, `hasNumberOrSymbol` e `passwordsMatch` direto no corpo
do componente. O `ChangePasswordForm.tsx` ainda faz o mesmo com `useState` + `useEffect`, que é o
padrão antigo — foi exatamente o que o commit `dabb4ed` ("calcula validações de senha direto no
render, sem useEffect") corrigiu no cadastro.

**Copie do `RegisterForm`, não do `ChangePasswordForm`.** Valor derivado de estado não precisa de
estado próprio nem de efeito para sincronizar.

### F-06 — Ler o token e limpá-lo da URL, com `<Suspense>` ⚠️

A outra metade do D-10. O token **precisa** viajar na query string do link (é assim que um link
funciona), mas não precisa **ficar** lá: URL com token entra no histórico do navegador e pode vazar
pelo header `Referer` para qualquer recurso que a página carregue.

Sequência obrigatória, nesta ordem:

1. Ler `useSearchParams().get('token')` e guardar em `useState` **no inicializador** — capturar
   antes de limpar, senão o valor some junto com a query.
2. `router.replace(pathname)` para remover a query da URL.

⚠️ **Armadilha do Next.js:** `useSearchParams()` num Client Component faz a rota inteira sair da
geração estática, e o `next build` **falha** com *"useSearchParams() should be wrapped in a suspense
boundary"* se não houver um `<Suspense>` acima. O `page.tsx` precisa envolver o formulário em
`<Suspense fallback={...}>`. Um teste de Jest em jsdom **não** pega isso — só o `npm run build`
pega, e é por isso que ele é obrigatório no critério de aceite da Fase 2.

### F-07 — Três estados na tela de redefinição, e o formulário só aparece no terceiro

Ao montar, `POST /auth/reset-password/verify`. Enquanto isso, e conforme o resultado:

| Estado | O que a tela mostra |
| :---- | :---- |
| `verificando` | Indicador de carregamento; nenhum campo |
| `invalido` | "Este link expirou ou já foi usado" + botão para `/forgot-password`. **Sem formulário** |
| `valido` | O formulário de senha nova |

Sem `?token=` nenhum na URL, vá direto para `invalido` — não chame a API.

Renderizar o formulário antes de saber que o token vale faria o usuário escolher uma senha,
confirmar, enviar, e só então descobrir que perdeu o trabalho. O `/verify` existe só para evitar isso.

### F-08 — Validar o formato do email antes de chamar, e nunca reinterpretar a resposta

A mensagem exibida é **a que a API devolveu** (`{ message }`), não uma string escrita aqui — se as
duas divergirem, quem lê o código do front acredita na cópia errada.

O formato do email é validado no client antes da chamada (com Zod, como o `registerAction` faz), só
para evitar um `400` inútil de ida e volta. E, como o `200` é sempre igual, **não existe** ramo de
"conta não encontrada" para escrever.

O botão de reenvio fica desabilitado por ~60 s depois de um envio. É cortesia visual: o limite que
vale é o do servidor (5/hora por IP, e 3/hora por conta).

### F-09 — Depois de redefinir, faça logout e vá para `/login` ⚠️

Redefinir revoga todos os refresh tokens (D-06), mas **não** invalida um access token que já esteja
no navegador — o `JWT` é stateless e vale até 15 minutos. Consequência concreta se o usuário estava
logado neste mesmo navegador: ele redefine a senha, é mandado para `/login`, e o `proxy.ts` vê o
cookie `JWT` ainda válido, considera "logado" e o devolve para `/`. Fica num limbo até o token expirar.

Solução: chame `logout()` do [useLogout.ts](src/hooks/useLogout.ts) em vez de um `router.push`
manual. Ele já faz as três coisas certas — `POST /auth/logout` best-effort (limpa os cookies via
`Set-Cookie`), `setUser(null)` (limpa o contexto), e `router.push("/login")` — e já trata a falha da
chamada, porque cookie `httpOnly` não pode ser limpo pelo JS daqui.

### F-10 — Escopo honesto do E2E: o Cypress não lê email

O caminho feliz completo depende de abrir uma caixa de email e extrair o token. O Cypress não faz
isso, e montar essa ponte (caixa de teste, IMAP, serviço de captura) custa muito mais do que
entrega neste projeto.

**Então o E2E cobre o que ele consegue cobrir de verdade:** a navegação a partir do login, a
mensagem genérica de confirmação, e a tela de link inválido. O caminho feliz de ponta a ponta é
coberto pela **suíte de integração da API** (Fase 5 do plano de lá), que tem o token em mãos porque
injeta um `sendEmail` espião.

Registre isso em `docs/backlog-e-casos-de-teste.md`, na seção "O que ainda não está coberto" — um
buraco de cobertura conhecido e escrito é uma decisão; não escrito, é um esquecimento.

### F-11 — Nenhuma variável de ambiente nova

`API_URL` já existe e já é tudo de que este repositório precisa. O link do email é montado pela
**API** (`FRONTEND_URL` + `PASSWORD_RESET_PATH`, ambos no `.env` de lá). Não crie variável aqui para
"configurar o caminho" — isso duplicaria a fonte da verdade em dois repositórios.

---

# PARTE A — Sua parte

Só há um item, e ele custa 30 segundos.

## A.1 — Confirmar que o caminho da rota bate com o `.env` da API

O link que chega no email é montado pela API como `FRONTEND_URL + PASSWORD_RESET_PATH + ?token=...`.
Este plano cria a rota **`/change-password`**, que é exatamente o default de `PASSWORD_RESET_PATH`.

Se você deixar essa variável com o valor default (ou nem a declarar), **não precisa fazer nada**. Se
tiver mudado, o valor no `.env` da API e o nome da pasta em `src/app/(auth)/` precisam bater — senão
todo link de email cai num 404.

Vale o mesmo para `FRONTEND_URL`: ele já existe no `.env` da API e precisa apontar para o endereço
onde este front realmente roda.

## A.2 — O que **não** muda (verificado na análise)

- **`.env` / `.env.example` / `.env.test`** — nenhuma variável nova (F-11).
- **`next.config.ts`** — o rewrite `/api/:path*` já cobre as rotas novas, sem alteração.
- **`Dockerfile` / `docker-compose.yml` / `.github/workflows`** — nenhuma alteração.

---

# PARTE B — Execução pelo Sonnet 5

> **Instruções para o agente executor.** Este roteiro é normativo: as decisões `F-xx` da seção 3 e
> as `D-xx` do plano da API já foram tomadas e aprovadas — implemente-as, não as reabra. Se algo no
> código contradisser este documento, **pare e reporte** em vez de escolher sozinho.
>
> **Regras de execução:**
> 1. **Uma fase por vez.** Ao fim de cada fase, rode os comandos de verificação e só siga se
>    estiverem verdes.
> 2. **Não invente padrão novo.** Cada arquivo novo tem um irmão existente citado na fase — leia o
>    irmão antes de escrever e siga o estilo dele: comentários em português explicando *por quê*,
>    CSS Modules, `useActionState`, indentação de 4 espaços nos arquivos de `src/app` e `src/hooks`.
> 3. **`RegisterForm.tsx` é o modelo de formulário, não `ChangePasswordForm.tsx`** — ver F-05.
> 4. **Não hardcode texto que a API devolve.** Mensagem de sucesso e de erro vêm do corpo da
>    resposta (F-08).
> 5. **Nenhuma variável de ambiente nova** (F-11).

## Fase 1 — Tela `/forgot-password` ✅

**Arquivos:**
`src/schemas/usuarios.ts`, `src/schemas/usuarios.test.ts`,
`src/hooks/useEsqueciSenha.ts`,
`src/app/(auth)/forgot-password/page.tsx`,
`src/app/(auth)/forgot-password/EsqueciSenhaForm.tsx`,
`src/app/(auth)/forgot-password/EsqueciSenhaForm.test.tsx`,
`src/app/(auth)/authForm.module.css`

Irmãos a imitar: [useLogin.ts](src/hooks/useLogin.ts) e
[LoginForm.tsx](src/app/(auth)/login/LoginForm.tsx).

1. **`src/schemas/usuarios.ts`** — acrescente:
   - `esqueciSenhaSchema`: `z.object({ email: z.email('Email inválido') })`
   - Ao fazer isso, extraia a regra de senha do `registerSchema` para uma constante `senhaSchema`
     reutilizável (`min(8)`, `max(100)`, `.refine(p => /[\d\W]/.test(p))`) — a Fase 2 precisa dela, e
     uma terceira cópia da mesma regra é uma a mais do que o aceitável.
2. **`src/hooks/useEsqueciSenha.ts`** — molde do `useLogin.ts`:
   - `useActionState` com uma action que valida com `esqueciSenhaSchema`, chama
     `apiFetchClient<{ message: string }>("/auth/forgot-password", { method: "POST",
     skipAuthRetry: true, body: { email } })` e devolve
     `{ success: true, message: <a message da API> }`.
   - No `catch`: `ApiError` → `{ success: false, message: e.message }` (cobre o `429`); qualquer
     outra coisa → `{ success: false, message: "Erro ao conectar à API." }`, mesma string do
     `useLogin`.
   - Exponha também `email`/`setEmail`, `isPending` e `dadosPreenchidos`.
   - **Cooldown de reenvio (F-08):** um `useState` com o instante do último envio bem-sucedido e um
     contador regressivo de 60 s. Se usar `setInterval`, limpe no cleanup do `useEffect`.
3. **`EsqueciSenhaForm.tsx`** (`'use client'`) — estrutura do `LoginForm`:
   - Título "Esqueceu a senha?" e subtítulo explicando que vai chegar um link por email.
   - Um `<input type="email" name="email" autoComplete="email">` dentro de `styles.campos`.
   - Botão `styles.botaoEnviar`, desabilitado com `isPending || !dadosPreenchidos`, com texto
     "Enviando..." enquanto pendente.
   - Erro em `styles.erro`, igual ao `LoginForm`.
   - **Estado de sucesso (F-04):** substitui o formulário pela mensagem devolvida pela API, mais um
     botão "Reenviar" (desabilitado durante o cooldown, mostrando os segundos restantes) e um
     `<Link href="/login">Voltar para o login</Link>`.
4. **`page.tsx`** — três linhas, igual a `login/page.tsx`: importa e renderiza o formulário, com o
   comentário de que a moldura vem do `(auth)/layout.tsx`.
5. **`authForm.module.css`** — acrescente ao fim, seguindo o tom dos comentários que já estão lá:
   `.esqueciSenha` (link discreto, alinhado à direita — usado na Fase 3), `.sucesso` (bloco de
   confirmação, espelhando `.erro` mas com `--pos`/`--pos-bg`) e `.botaoSecundario` (o "Reenviar").
   Confirme os nomes das variáveis de cor em `src/app/globals.css` antes de usar.
6. **`EsqueciSenhaForm.test.tsx`** — molde do `LoginForm.test.tsx` (`jest.mock("@/lib/apiClient.client")`,
   `mockPush` para `next/navigation`):
   - Botão desabilitado com o campo vazio.
   - Email em formato inválido → não chama a API e mostra a mensagem de erro.
   - Envio bem-sucedido → chamou `apiFetchClient` com o path e o corpo certos, e a tela passou a
     mostrar a mensagem **devolvida pelo mock** (prova que o texto não está hardcoded).
   - `ApiError(429, "Muitas tentativas...")` → mostra a mensagem da API.
   - Botão "Reenviar" começa desabilitado logo após o envio.

**Verificação:**
```bash
npm test -- EsqueciSenhaForm
```
```bash
npm run lint
```

## Fase 2 — Tela `/change-password` ✅

**Arquivos:**
`src/schemas/usuarios.ts`, `src/schemas/usuarios.test.ts`,
`src/hooks/useRedefinirSenha.ts`,
`src/app/(auth)/change-password/page.tsx`,
`src/app/(auth)/change-password/RedefinirSenhaForm.tsx`,
`src/app/(auth)/change-password/RedefinirSenhaForm.test.tsx`

Irmãos a imitar: [RegisterForm.tsx](src/app/\(auth\)/register/RegisterForm.tsx) (condições de senha
calculadas no render — F-05) e [useLogin.ts](src/hooks/useLogin.ts).

1. **`src/schemas/usuarios.ts`** — `redefinirSenhaSchema` usando o `senhaSchema` da Fase 1, com
   `.refine()` de confirmação e a mensagem "As senhas não coincidem" (mesma string do
   `registerSchema`).
2. **`src/hooks/useRedefinirSenha.ts`:**
   - **Token (F-06):** `const [token] = useState(() => searchParams.get('token') ?? '')` — capturar
     no inicializador, **antes** de limpar. Em seguida, um `useEffect` que roda uma vez com
     `router.replace(pathname)`.
   - **Verificação (F-07):** estado `'verificando' | 'invalido' | 'valido'`. Sem token → `'invalido'`
     direto, sem chamar a API. Com token → `POST /auth/reset-password/verify`; sucesso → `'valido'`,
     qualquer erro → `'invalido'`.
   - **Submissão:** `useActionState` chamando
     `POST /auth/reset-password` com `{ token, newPassword, confirmNewPassword }`.
   - **Sucesso (F-09):** chame `logout()` do `useLogout()`. **Não** use `router.push("/login")`
     direto, **não** chame `setUser` com um usuário, **não** espere `AuthUser` na resposta.
   - Um `400` na submissão significa que o token morreu entre a verificação e o envio (expirou, ou
     outro pedido o invalidou): mostre a mesma tela de `'invalido'`, não um erro de formulário.
3. **`RedefinirSenhaForm.tsx`** (`'use client'`):
   - Os três estados do F-07. O de `'invalido'` traz o `<Link href="/forgot-password">` para pedir
     outro link.
   - No estado `'valido'`: dois campos de senha (`autoComplete="new-password"`), o olho de
     mostrar/ocultar (`styles.campoSenha` + `styles.alternarSenha`) e a `<ul className={styles.condicoes}>`
     com as três condições — **copie o helper `condicao()` do `RegisterForm`**.
   - Botão desabilitado enquanto as três condições não passarem, igual ao `RegisterForm`.
4. **`page.tsx` (F-06 ⚠️):** envolva o formulário em
   `<Suspense fallback={<p>Verificando o link...</p>}>`. Sem isso o `next build` falha, e nenhum
   teste de Jest acusa.
5. **`RedefinirSenhaForm.test.tsx`** — mocke `useSearchParams`/`useRouter` de `next/navigation` e
   `@/lib/apiClient.client`; mocke também `@/hooks/useLogout`:
   - Sem `?token=` → estado inválido, **e `apiFetchClient` não foi chamado**.
   - Token que o `/verify` recusa → estado inválido, sem formulário na tela.
   - Token válido → formulário aparece e as condições de senha reagem ao que é digitado.
   - Submissão bem-sucedida → chamou `/auth/reset-password` com token e as duas senhas, e **chamou
     `logout()`** (é a asserção que prova o F-09).
   - `ApiError(400)` na submissão → volta ao estado inválido.
   - `router.replace` foi chamado para limpar o token da URL (asserção do F-06).

**Verificação:**
```bash
npm test -- RedefinirSenhaForm
```
```bash
npm run build
```
⚠️ O `npm run build` aqui **não é opcional**: é o único passo que pega o erro de `<Suspense>` do F-06.

## Fase 3 — Entrada pelo login e guarda de rota ✅

**Arquivos:** `src/app/(auth)/login/LoginForm.tsx`, `src/app/(auth)/login/LoginForm.test.tsx`,
`src/proxy.ts`

1. **`LoginForm.tsx`** — um `<Link href="/forgot-password" className={styles.esqueciSenha}>Esqueci
   minha senha</Link>` logo abaixo do bloco `styles.campos` e acima do botão de envio. É onde o
   usuário está olhando quando a senha falha.
2. **`LoginForm.test.tsx`** — um caso a mais: o link existe e aponta para `/forgot-password`.
3. **`proxy.ts` (F-03 ⚠️):**
   - Acrescente `"/forgot-password"` ao array `ROTAS_SOMENTE_DESLOGADO` **e** ao `config.matcher`.
   - **Não acrescente `/change-password` a nenhum dos dois.** Deixe um comentário no código, junto do
     array, explicando por quê — que o link do email precisa funcionar mesmo com sessão ativa, senão
     quem esqueceu a senha do celular e está logado no computador é chutado para `/` sem conseguir
     redefinir nada. Sem esse comentário, a próxima pessoa "corrige a inconsistência" e reintroduz o
     bug.

**Verificação:**
```bash
npm test
```
```bash
npm run lint && npm run build
```

## Fase 4 — E2E (Cypress) ⚠️ escrito, não executado

`cypress/e2e/recuperar-senha.cy.ts` foi escrito conforme o escopo abaixo, mas
**não foi rodado** — `npm run test:e2e` exige a API real no ar com esta feature
implementada (os três endpoints de `/auth/forgot-password`,
`/auth/reset-password/verify` e `/auth/reset-password`), o que está fora do alcance
deste repositório. Rode `npm run test:e2e` manualmente assim que a API estiver pronta.

**Arquivos:** `cypress/e2e/recuperar-senha.cy.ts`

Irmão a imitar: [criar-conta.cy.ts](cypress/e2e/criar-conta.cy.ts) (fluxo curto, seletores por
`name`/`href`).

Escopo, conforme o F-10 — o Cypress não lê email, então **não** tente cobrir o caminho feliz:

1. A partir de `/login`, clicar em "Esqueci minha senha" leva a `/forgot-password`.
2. Enviar um email **inexistente** mostra a mensagem genérica de confirmação (é a prova visível do
   D-03 no front: a tela não delata que a conta não existe).
3. Visitar `/change-password?token=tokeninvalido` mostra a tela de link expirado, **sem** campos de
   senha, e o botão leva de volta a `/forgot-password`.
4. Um comentário no topo do arquivo dizendo o que este arquivo **não** cobre e onde essa cobertura
   mora (a suíte de integração da API).

⚠️ O E2E roda contra a **API real** (`npm run test:e2e` sobe só o front, na porta 3100). A API
precisa estar no ar com a feature implementada, senão os casos 2 e 3 falham por rede, não por regressão.

**Verificação:**
```bash
npm run test:e2e
```

## Fase 5 — Documentação ✅

**Arquivos:** `docs/backlog-e-casos-de-teste.md`, `README.md`

1. **`docs/backlog-e-casos-de-teste.md`:**
   - Em "Backlog de funcionalidades" → "Conta e identidade": a funcionalidade nova, no formato das
     linhas que já estão lá.
   - Em "Testes de componentes": os dois formulários novos.
   - Em "O que ainda não está coberto": o caminho feliz de ponta a ponta da recuperação de senha,
     com a justificativa do F-10 e o ponteiro para a suíte de integração da API. **Não omita este
     item** — é o registro de uma decisão, não de um esquecimento.
2. **`README.md`** — se houver seção de rotas ou de funcionalidades, acrescente as duas telas no
   formato que já estiver em uso. Leia antes de escrever; não crie seção nova.
3. **Este documento** — marque as fases concluídas.

**Verificação final (do zero):**
```bash
npm run lint && npm test && npm run build
```

## Checklist de aceite (o Sonnet deve reportar item a item)

- [ ] `/forgot-password` mostra sempre a mensagem devolvida pela API, sem ramo de "conta não encontrada" — F-08 / D-03
- [ ] A mensagem exibida vem do corpo da resposta, não de uma string no front (provado por teste com mock) — F-08
- [ ] `/change-password` verifica o token antes de renderizar qualquer campo de senha — F-07
- [ ] Sem `?token=` na URL, a tela nem chama a API — F-07
- [ ] O token é lido antes de a query ser limpa, e a URL fica sem ele — F-06
- [ ] `page.tsx` da redefinição tem `<Suspense>` e `npm run build` passa — F-06
- [ ] Após redefinir, `logout()` é chamado (não `router.push` direto) — F-09
- [ ] `/forgot-password` está no matcher e em `ROTAS_SOMENTE_DESLOGADO`; `/change-password` **não está em nenhum dos dois**, com comentário explicando — F-03
- [ ] As condições de senha são calculadas no render, sem `useEffect` — F-05
- [ ] Nenhuma variável de ambiente nova foi criada — F-11
- [ ] O buraco de cobertura do E2E está escrito no `backlog-e-casos-de-teste.md` — F-10
- [ ] `npm run lint && npm test && npm run build` verdes, incluindo todos os testes que já existiam
