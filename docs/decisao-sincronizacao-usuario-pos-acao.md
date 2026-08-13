# Decisão: como sincronizar o usuário no contexto após login/cadastro/logout/perfil

> Documento de decisão já implementada. Registra o problema observado, as alternativas
> levantadas (incluindo comparação com outro projeto do mesmo autor,
> [gbrlmzl/site-rinha-v2](https://github.com/gbrlmzl/site-rinha-v2)) e por que a solução
> final foi escolhida em vez do fix mínimo que a precedeu.

## 1. O gatilho: crash no layout raiz

Testando o fluxo de cadastro (`cypress/e2e/criar-conta.cy.ts` e manualmente no navegador),
apareceu de forma intermitente:

```
Uncaught NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before which
the new node is to be inserted is not a child of this node.
Erro não tratado no layout raiz: NotFoundError (src/app/global-error.tsx:13:17)
```

`global-error.tsx` é o boundary mais alto do Next.js — substitui `<html>/<body>` inteiros.
O app inteiro caía, não só a página de cadastro.

## 2. Causa raiz

Depois de um login/cadastro bem-sucedido, o padrão em `RegisterForm.tsx`, `useLogin.ts` e
`useLogout.ts` era:

```ts
router.refresh();  // refaz a árvore de Server Components a partir da raiz
router.push("/");  // navega imediatamente em seguida
```

Ambos disparam buscas RSC assíncronas que patcheiam o DOM. Capturado na aba de rede: uma
única ação de cadastro disparava **3 requisições `GET /?_rsc=...` concorrentes**. Quando as
respostas chegam fora de ordem, uma tenta reconciliar um nó que a outra navegação já
substituiu → `NotFoundError`. Intermitente porque depende de timing de rede — por isso
passava limpo na maioria das vezes e falhava sob mais carga (ex.: CI).

`router.refresh()` existia só para uma coisa: repopular o `UserProvider` (contexto React
que expõe "quem está logado"), cujo valor vinha exclusivamente de `getCurrentUser()` no
layout raiz (`src/app/layout.tsx`).

## 3. Fix imediato (aplicado primeiro, depois substituído)

Envolver as duas chamadas em `startTransition` fez o React tratar `refresh()` + `push()`
como uma atualização concorrente única em vez de duas competindo — parou de reproduzir o
crash em testes repetidos manualmente e via Cypress. Mas não eliminava o desperdício: cada
login/cadastro/logout continuava re-executando a árvore de Server Components inteira só
para atualizar um objeto de usuário, e as 3 requisições `_rsc` concorrentes continuavam
acontecendo (só paravam de conflitar).

## 4. Pesquisa: como outro projeto do mesmo autor resolve isso

[gbrlmzl/site-rinha-v2](https://github.com/gbrlmzl/site-rinha-v2) enfrenta o mesmo problema
(Next.js App Router + Server Actions de auth) e **nunca usa `router.refresh()`** (zero
ocorrências no repositório). O mecanismo:

```ts
// src/contexts/AuthContext.tsx — Context 100% client, sem hidratação SSR
const [user, setUser] = useState<User | null>(null);
const refreshUser = useCallback(async () => {
  const userData = await getUser(); // fetch('/api/auth/me'), puramente client
  setUser(userData);
}, []);

// LoginForm.tsx
useEffect(() => {
  if (state?.success) {
    refreshUser().then(() => {
      router.push(nextSafe); // só navega depois do estado já resolvido
    });
  }
}, [state?.success, refreshUser]);
```

O ponto estrutural: **atualizar o usuário nunca envolve o Next Router.** É só
`fetch` + `setState`. `push()` só é chamado depois que essa Promise resolve, então nunca
existem duas operações que tocam a árvore RSC ao mesmo tempo — a classe inteira do bug
não existe nesse desenho. A segurança real continua em `src/proxy.ts` (middleware lendo o
cookie JWT), mesmo papel que o nosso `src/proxy.ts` já cumpre — o Context é UI, não gate de
acesso, nos dois projetos.

Diferença relevante: aquele projeto não tem SSR (sem `getCurrentUser()` no layout, sem
hidratação inicial — daí o `isLoading`/"Carregando..." no `ProtectedRoute` até o primeiro
`fetch` resolver). Este projeto já tem SSR funcionando bem e não faria sentido abrir mão
disso só para copiar o padrão inteiro.

## 5. Opções consideradas

### Opção A — Manter `startTransition(refresh + push)`

- **Prós:** já implementado, resolve o crash, menor diff.
- **Contras:** continua fazendo um round-trip RSC completo (re-render do layout raiz
  inteiro) só para atualizar um objeto de usuário; 3 requisições de rede por ação em vez
  de 1; não generaliza (o mesmo padrão existia também em `useProfile.ts`, fora do escopo do
  fix original).

### Opção B — Copiar o modelo do site-rinha-v2 (Context 100% client, sem SSR)

- **Prós:** validado em produção noutro projeto; um único mecanismo (`refreshUser`) cobre
  todos os casos.
- **Contras:** joga fora a hidratação SSR que este projeto já tem — introduziria um flash
  de loading ("Carregando...") na primeira carga de qualquer página, e uma requisição
  `GET /users/me` extra a cada login/cadastro que não é necessária aqui, porque a resposta
  do próprio `/auth/login`/`/auth/register` já traz o usuário atualizado (ver seção 6).

### Opção C — Híbrido: manter hidratação SSR, trocar `refresh()` por `setUser()` client-side (adotada)

`UserProvider` passa a guardar o usuário em `useState` (inicializado pela prop vinda do
SSR) e expõe um setter via contexto. Quem dispara login/cadastro/logout/edição de perfil
chama esse setter diretamente com o `AuthUser` que a própria resposta da API já trouxe —
sem `router.refresh()`, sem requisição extra.

- **Prós:** sem loading flash na primeira carga (mantém o SSR); zero requisições a mais
  (reaproveita o corpo da resposta que already existe); `push()` some da disputa por
  completo — não há mais nenhuma segunda operação tocando a árvore RSC.
- **Contras:** maior superfície de mudança que a Opção A (toca `UserProvider` e 4 pontos de
  chamada); depende de o contrato da API realmente devolver o usuário atualizado em cada
  endpoint — verificado abaixo, não assumido.

## 6. Verificação do contrato antes de implementar

`types/auth.ts` já documentava: *"Mesmo shape devolvido pela API em login/registro/refresh
e em GET/PATCH /users/me."* Em vez de confiar só no comentário, testei direto contra a API
(`curl http://localhost:8080/...`, a mesma que `API_URL` aponta em `.env.local`):

| Endpoint | Corpo da resposta |
| :---- | :---- |
| `POST /auth/register` | `{"user":{"id":443,"name":"Doc Verify","username":"docverify01","email":"...","profilePic":null}}` |
| `POST /auth/login` | mesmo shape |
| `PATCH /users/me` | mesmo shape |
| `GET /users/me` | mesmo shape **+ `"hasPassword":true`** |

Achado importante que mudou a implementação: **`hasPassword` só vem em `GET /users/me`.**
Login, cadastro e `PATCH /users/me` não o incluem. Se `setUser()` substituísse o objeto
inteiro, cada login/edição de perfil apagaria esse campo do contexto até a próxima carga de
página — reproduzido manualmente antes da correção (o link "Alterar senha" sumia da tela
depois de trocar o avatar). Corrigido fazendo `setUser()` mesclar com o usuário anterior em
vez de substituir (`null` explícito continua limpando tudo, para o logout).

## 7. O que foi implementado

- **`src/components/providers/UserProvider.tsx`** — `useState` inicializado pela prop SSR;
  novo `useSetCurrentUser()` expõe um setter que faz merge (`{...prev, ...patch}`) e só
  zera de fato quando `patch === null`.
- **`src/app/(auth)/cadastro/registerAction.ts`** — tipado como `ActionState<AuthUser>`;
  captura `{ user }` da resposta de `/auth/register` e devolve em `data`.
- **`src/app/(auth)/cadastro/RegisterForm.tsx`** — `setUser(state.data)` seguido de
  `router.push("/")`, sem `startTransition` (deixou de ser necessário: não há mais duas
  operações concorrentes).
- **`src/hooks/useLogin.ts`** — mesmo padrão, capturando `{ user }` de `/auth/login`.
- **`src/hooks/useLogout.ts`** — `setUser(null)` antes do `push("/login")`.
- **`src/hooks/useProfile.ts`** — `confirmChangeProfilePicture` e `saveName` chamam
  `setUser(user)` direto com a resposta do `PATCH /users/me`; o parâmetro
  `onProfileUpdated` (que só existia para o chamador poder disparar `router.refresh()`)
  foi removido por não ter mais utilidade.
- **`src/app/profile/Profile.tsx`** — não injeta mais `onProfileUpdated`; `useRouter`
  removido (não sobrou nenhum uso).

## 8. Trade-off aceito

O contexto de usuário deixa de ser garantidamente igual ao que o servidor tem em todo
momento — passa a ser client state, atualizado explicitamente pelas próprias ações. Isso já
era true na prática mesmo com `router.refresh()` (também era um snapshot pontual); a
diferença é que agora nada além dessas 4 ações client-side atualiza esse contexto. Não é
uma regressão de segurança: quem decide acesso de verdade é `src/proxy.ts` (middleware,
lê o cookie JWT a cada request), igual antes — `UserProvider` sempre foi só UI.

## 9. Validação

- `tsc --noEmit`: 0 erros.
- Suíte Jest: 300 testes, todos passando (`UserProvider.test.tsx` novo cobre hidratação,
  merge, limpeza no logout e preservação de `hasPassword`; `RegisterForm.test.tsx`,
  `LoginForm.test.tsx`, `useProfile.test.ts`, `useLogout.test.ts` atualizados para o novo
  contrato).
- `cypress/e2e/criar-conta.cy.ts`: passando.
- Testado manualmente no navegador: login, cadastro, logout e edição de perfil
  (nome + avatar) repetidas vezes, sem nenhum `NotFoundError` no console. Rede confirmando
  **1 única requisição `_rsc`** por ação (contra as 3 concorrentes de antes).

## 10. Sinais para revisitar

- Se a API passar a devolver campos diferentes em cada endpoint de auth (além do já
  conhecido `hasPassword`), reavaliar se o merge automático em `useSetCurrentUser` ainda é
  suficiente ou se algum call site precisa de um merge mais seletivo.
- Se surgir necessidade real de refletir mudanças feitas no usuário por *outra* aba/sessão
  em tempo real, isso exigiria voltar a buscar do servidor periodicamente (polling ou
  websocket) — não resolvido por este desenho, que só atualiza em resposta às próprias
  ações do usuário nesta aba.
