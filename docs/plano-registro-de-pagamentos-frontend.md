# Plano: registro e rastreio de pagamentos — front-end

> **Status:** documento de decisão. Nada foi implementado. Contraparte da **Parte C** de
> [`../docs/04-arquitetura-registro-de-pagamentos.md`](../../docs/04-arquitetura-registro-de-pagamentos.md)
> (seções C.1 a C.7, e §7 "o que este plano deliberadamente não faz"), que define o contrato dos
> 6 endpoints novos e as decisões `D-xx`/`RN-xxx` citadas aqui. A **Parte B** daquele documento (API)
> já foi executada em sessão separada: 6 rotas prontas, 333 testes verdes, documentada em
> `sistema-controle-despesas-api/docs/plano-registro-de-pagamentos.md`.
>
> **Divisão de trabalho:**
> - **Parte A** (console da AWS) e **Parte B** (API) — já feitas, no outro repositório. Nada aqui
>   depende de refazê-las, só de consumir o contrato que elas produziram.
> - **Este documento** é a Parte C: o que o repositório do **front-end** precisa implementar.
>
> **Dependência real com a API:** a leitura (badge, tela de acertos, confirmação, dispensa) pode
> ser escrita e testada (Jest, mockando `apiFetchClient`/`apiFetch`) **antes** de apontar para uma
> API rodando de verdade. O upload de comprovante (Fases 6 a 8) também pode ser escrito e testado
> por unidade sem rede nenhuma — mas só é **verificável de ponta a ponta** com a API no ar **e**
> o bucket S3 de verdade configurado (Parte A do plano-fonte), porque o passo 3 do upload fala
> direto com a AWS. O Cypress reflete essa fronteira (Fase 10, F-17).

---

## 1. Contrato da API (fonte da verdade)

Seis rotas novas, todas exigindo sessão, montadas sob `/residences` — nenhuma delas tem
equivalente de "chamada sem autenticação" como a recuperação de senha tinha. Resumo por rota,
com as decisões (`D-xx`) e regras (`RN-xxx`) do plano-fonte que moldam o que o front pode/deve
fazer com cada uma:

| Rota | O que faz | `D-xx` / `RN-xxx` que importam para o front |
| :---- | :---- | :---- |
| `GET .../closures/:period/settlements` | Lista os **pares** devedor→credor de uma competência fechada | D-01/D-29 (é par, não pessoa); D-30 (dois carimbos por linha); RN-080 (404 pra não-membro) |
| `POST .../settlements/:id/receipts` | Abre a intenção de upload (passo 2 do fluxo S3) | D-23; RN-074 (só o `payerId` **daquele** par); D-18 (503 se storage desligado) |
| `POST .../receipts/:id/complete` | Finaliza o upload, valida no S3, grava `paidAt` | D-23; **idempotente** — completar de novo devolve 200, nunca 409 |
| `POST .../settlements/:id/confirm` | O credor confirma que recebeu **aquele** valor | RN-075/RN-076 (sem ordem obrigatória); **não toca o S3**, funciona com `storageEnabled=false` |
| `GET .../receipts/:id/url` | URL pré-assinada de leitura, **5 minutos** | D-25 (nunca cachear, pedir no momento de exibir) |
| `POST .../settlements/:id/waive` | O owner dispensa a linha inteira, com motivo | D-07/RN-082; notifica os dois lados do par |

E uma alteração num endpoint que o front já consome: `GET /residences/:code/expenses` ganha um
bloco `settlement` (§6.7 do plano-fonte) — é o que alimenta o selo da competência **sem
requisição extra** (C.1). `null` quando a competência está aberta ou quando o fechamento não tem
linhas (fechamento legado, D-09).

```ts
settlement: {
  status: 'AWAITING_PAYMENT' | 'AWAITING_CONFIRMATION' | 'SETTLED';
  totals: { payerSide: { lines: number; paid: number }; receiverSide: { lines: number; confirmed: number } };
  // D-30: você pode estar em mais de um par — nunca PAYER e RECEIVER ao mesmo tempo (D-29
  // opera sobre saldo líquido, que já tem um sinal só).
  mine: { id: string; role: 'PAYER' | 'RECEIVER'; counterpartyName: string; amountInCents: number; status: StatusAcerto }[];
} | null
```

Três comportamentos da API que mudam o que o front pode fazer:

1. **Uma linha é um par, não uma pessoa** (D-01=B, revisão 3). A tela deixa de ter "quem paga /
   quem recebe" como duas colunas fixas — é uma lista de linhas, cada uma com um devedor e um
   credor nomeados. Quem tem 2 dívidas anexa 2 comprovantes, separadamente (D-30).
2. **Sem ordem obrigatória entre os dois lados de uma linha** (RN-076). O botão de confirmar
   recebimento nunca fica bloqueado esperando o comprovante do devedor — no máximo um aviso
   discreto. Isso é literal no contrato: `confirm` devolve `200` mesmo que `paidAt` ainda seja
   `null`.
3. **`complete` é idempotente, `confirm`/`waive` não são.** Reenviar `complete` depois de um
   timeout de rede é seguro (devolve o estado atual). Reenviar `confirm` numa linha já confirmada
   devolve `409` — e isso é esperado, não um bug a esconder: a ação é irreversível na V1 (D-10).

O limite de tamanho (5 MB) e os tipos aceitos (`RN-081`: `image/jpeg`, `image/png`, `image/webp`,
`application/pdf`) são validados pela API e pelo S3 — o front valida **antes** de chamar, só para
poupar uma ida e volta inútil, nunca como a única barreira.

---

## 2. O que já existe neste repositório e que este plano reaproveita

A análise confirmou que todos os arquivos citados pela Parte C do plano-fonte existem, com os
caminhos exatos que ela cita. Nada foi inventado nem precisou ser corrigido:

| O que já existe | Onde | Como é reaproveitado aqui |
| :---- | :---- | :---- |
| Selo de mês fechado, alimentado por `resumo.isClosed` | [ResumoDoMes.tsx](../src/app/dashboard/residences/%5Bcode%5D/ResumoDoMes.tsx) | Ganha os 4 estados de C.1, sem requisição nova — o dado já chega em `resumo` |
| Fechamento de mês por Server Action | [fecharMesAction.ts](../src/app/dashboard/residences/%5Bcode%5D/expenses/fecharMesAction.ts) | Molde de `confirmarRecebimentoAction`/`dispensarAcertoAction` (F-13): `'use server'`, `apiFetch`, `ApiError` → `{success:false,message}`, `revalidatePath` |
| Modal de confirmação irreversível | [ConfirmacaoModal.tsx](../src/app/dashboard/residences/%5Bcode%5D/ConfirmacaoModal.tsx) | Reaproveitado **sem alteração** para "Confirmar recebimento" (C.3) |
| Modal de formulário (com campo de texto) | [EditarDespesaModal.tsx](../src/app/dashboard/residences/%5Bcode%5D/expenses/EditarDespesaModal.tsx) | Molde do `DispensarAcertoModal` (F-18) — `ConfirmacaoModal` não tem campo de motivo |
| Leitura server-side via `apiFetch`, com tradução de nomes EN→PT | [expensesApi.ts](../src/lib/expensesApi.ts), [reportsApi.ts](../src/lib/reportsApi.ts) | Molde de `acertosApi.ts` (novo) e da extensão do bloco `settlement` em `getResidenceExpenses` |
| Chamada client-side com `apiFetchClient` | [useLogin.ts](../src/hooks/useLogin.ts) | Molde do hook de upload (F-14) — chamada direta, sem passar por um wrapper de "…Api.ts" |
| `ApiError` com `status`/`message`, nunca reinterpretada | [apiError.ts](../src/lib/apiError.ts) | Mensagens de erro do C.7 vêm do corpo da resposta, como em todo o resto do projeto |
| `ActionState<T>` | [types/actions.ts](../src/types/actions.ts) | Retorno das duas Server Actions novas |
| Tradução `/app/...` → `/dashboard/...` do `linkTo` de notificação | [linkNotificacao.ts](../src/utils/linkNotificacao.ts) | **Já cobre** o `linkTo` de `SETTLEMENT_PENDING`/`SETTLEMENT_READY` (`/app/residences/{code}/settlements?...`) — nenhuma alteração necessária, só um caso de teste a mais para não regredir por acidente |
| Tab bar do mobile já com 4 itens (`base` preenchido) | [AppShell.tsx](../src/components/layout/AppShell.tsx) | ~~Confirma C.2: **não** entra item novo na navegação~~ — **revisado**: "Acertos" entrou no rail do desktop (a tab bar do mobile continua com 4 itens, como "Membros"). Consequência: a tela passou a ser alcançável **sem** `?mes&ano`, e a `page.tsx` precisou de um padrão — a última competência **fechada** (`ultimaCompetenciaFechada`), nunca a aberta, que não tem fechamento (RN-069) e devolveria 404 |
| Fluxo de fechar/reabrir mês exibindo `error.message` genérico | [ConsultaDespesas.tsx](../src/app/dashboard/residences/%5Bcode%5D/expenses/ConsultaDespesas.tsx) | O `409` "mês já tem comprovante anexado" (RN-077) **já aparece** ao tentar reabrir, sem nenhuma alteração — é a mesma `ApiError.message` que `reabrirMesAction` já repassa |

**O que não existe e é peça genuinamente nova** (mesma conclusão do plano-fonte para a API,
válida aqui): o **cliente do endpoint de leitura de acertos**, a **orquestração do upload em 4
passos falando direto com o S3**, e a **compressão de imagem no navegador** (D-19) — não há
precedente no código; [`resumoImagem.ts`](../src/utils/resumoImagem.ts) desenha e rasteriza um
SVG próprio, não recomprime um arquivo enviado pelo usuário.

**Uma divergência de tipos encontrada na análise, que este plano precisa resolver:** o painel da
residência ([page.tsx](../src/app/dashboard/residences/%5Bcode%5D/page.tsx)) hoje **remonta**
manualmente o objeto `resumo` ao passá-lo para `PainelResidencia`, descartando campos
(`resumo={{ totalInCents, quantidade, isClosed, porMembro }}`, sem `closedAt`/`closedByName`/
`settlement`). O bloco `settlement` precisa ser acrescentado a essa remontagem explicitamente —
não basta estender o tipo, ver Fase 1.

---

## 3. Decisões de arquitetura novas

Numeradas a partir de `F-12`, continuando de onde
[`plano-recuperacao-de-senha-frontend.md`](./plano-recuperacao-de-senha-frontend.md) parou
(`F-01` a `F-11`).

### F-12 — A leitura inicial da tela de acertos é Server Component, no molde do resto do projeto

`GET .../closures/:period/settlements` é buscada com `apiFetch` (server-only, `next/headers`),
exatamente como `getResidenceExpenses`/`getResidenceReport`/`getResidenceDetail` já fazem. Novo
arquivo `src/lib/acertosApi.ts`, mesma forma: interface `…ApiResponse` privada, tradução para
nomes em português, função exportada que a `page.tsx` da rota nova chama.

**Isto não vale para tudo em Fases 4+** — ver F-14 e F-15, que são as exceções deliberadas.

### F-13 — Confirmar recebimento e dispensar acerto são Server Actions convencionais

`POST .../settlements/:id/confirm` e `POST .../settlements/:id/waive` não tocam o S3 (a própria
Parte C diz isso da confirmação: "Esta rota não toca o S3 e continua funcionando com
`storageEnabled === false`"). Não há razão para fugir do padrão que `fecharMesAction.ts` e
`arquivarResidenciaAction.ts` já estabelecem: `'use server'`, `apiFetch`, captura de `ApiError` →
`{success:false, message: e.message}`, `revalidatePath` da rota de acertos. A Parte C já é
explícita sobre a confirmação: *"Um POST sem corpo, via Server Action, no molde de
fecharMesAction.ts"* (C.3).

### F-14 — Anexar comprovante roda inteiramente no client — apesar do nome, NÃO é Server Action ⚠️

Esta é a armadilha mais fácil de cair por analogia com F-13: todo outro arquivo `…Action.ts` do
projeto é `'use server'`. **Este não pode ser.**

D-28 exige que o navegador fale **direto** com o S3 (passo 3 do C.4) — um Server Action executa
no servidor Next, então colocar a orquestração inteira num Server Action forçaria o arquivo a
passar pelo servidor do front antes de chegar no S3, exatamente o que D-13/D-23/D-28 foram
desenhados para evitar. O código normativo do C.4 já mostra isto sem ambiguidade: os passos 2 e 4
chamam `apiFetchClient` (client, mesma origem), e o passo 3 é `fetch` puro contra o S3
(cross-origin, sem `apiFetchClient`, sem `credentials: 'include'`).

Implementação: um hook client comum, `useAnexarComprovante.ts`, no molde de `useLogin.ts` — chama
`apiFetchClient` diretamente, sem passar por um `acertosApi.ts` (que é server-only, F-12, e
quebraria o build se importado num Client Component). O nome termina em "…comprovante" para seguir
a convenção de nomear a ação, mas **não** leva `'use server'` no topo do arquivo.

### F-15 — A URL de leitura do comprovante é buscada no client, sob demanda, nunca no Server Component

D-25 é explícito: nenhuma URL pré-assinada pode ficar em cache ou em estado de longa duração,
porque ela expira em 5 minutos e é reemitida sob checagem de `Membership` a cada pedido. Se a
`page.tsx` da tela de acertos (Server Component, F-12) buscasse a URL junto com a lista, ela
poderia já estar vencida no momento em que o usuário efetivamente olha a miniatura — a montagem
do Server Component não coincide com o momento em que o React realmente pinta a tela no navegador,
e menos ainda com o momento em que alguém rola até aquela linha.

Componente `Comprovante.tsx` (`'use client'`) busca a própria URL com `apiFetchClient` ao montar
(ou ao ser exibido, se for lazy). Nunca recebe a URL como prop vinda do servidor.

### F-16 — Compressão de imagem é peça nova, sem precedente para reaproveitar

D-19 pede compressão e normalização no navegador antes de qualquer requisição:
`createImageBitmap` + `canvas` → WebP, lado maior ~1600px, alvo ~300 KB, o que também descarta o
EXIF (inclusive GPS) por redesenhar a imagem do zero. Novo utilitário
`src/utils/comprimirImagem.ts`. **PDF nunca passa por aqui** — o C.4 é explícito nisso, e não faz
sentido "comprimir" um PDF com canvas.

### F-17 — Escopo honesto do Cypress: não cobre o upload de ponta a ponta

Mesmo raciocínio do F-10 da recuperação de senha, por um motivo diferente: o upload fala direto
com o S3 (D-28), e isso só funciona com o bucket real configurado e CORS liberado para a origem de
teste (Parte A do plano-fonte, que já está feita — mas não necessariamente para a origem que o
Cypress usa, `http://localhost:3100`). Não é razoável um agente validar isso de ponta a ponta sem
saber se aquela origem específica está na lista de CORS do bucket.

**O que o Cypress cobre de verdade** (Fase 10): fechar um mês com saldo ≠ zero, abrir a tela de
acertos, confirmar recebimento como credor (não toca o S3, RN-076) e ver o mês virar `SETTLED`
quando for a última pendência. **O que fica de fora, documentado, não esquecido:** o caminho
completo de anexar comprovante. A cobertura real desse caminho é a suíte de integração da API
(Fase 8 da Parte B do plano-fonte), que já roda com um storage fake em memória.

### F-18 — O modal de dispensa é um form-modal, não o `ConfirmacaoModal`

`ConfirmacaoModal.tsx` não tem campo de texto — foi desenhado para ações sem parâmetro (sair,
remover, arquivar). A dispensa exige um motivo de 3 a 200 caracteres (RN-082), então o componente
novo (`DispensarAcertoModal.tsx`) segue o molde de `EditarDespesaModal.tsx`: `useActionState` +
`Form` do `next/form` direto contra a Server Action, campo controlado, botão desabilitado até o
motivo ter ao menos 3 caracteres.

### F-19 — O texto e o estado do selo vivem num único helper puro, reusado em três lugares

O status de uma competência (`AWAITING_PAYMENT`/`AWAITING_CONFIRMATION`/`SETTLED`) e o texto do
selo aparecem em três telas: o painel (`ResumoDoMes`, C.1), a lista de despesas
(`ConsultaDespesas`, botão "Ver acertos") e a própria tela de acertos (cabeçalho de resumo). Um
helper puro, `src/utils/acerto.ts`, com uma função `descricaoSelo(settlement: AcertosDaCompetencia
| null): { texto: string; tom: 'neutro' | 'atencao' | 'positivo' } | null` evita reescrever a
mesma cadeia de `if` três vezes — e evita que uma delas fique desatualizada se o texto mudar. Mesmo
espírito de D-22 no plano da API (estado derivado, calculado num único lugar): aqui é só formatação
de texto, mas a duplicação é exatamente o mesmo risco.

---

## 4. Fases de implementação

> **Regras de execução**, iguais às do plano da recuperação de senha: uma fase por vez, comando de
> verificação verde antes da próxima, nenhum padrão novo sem um irmão citado, texto de erro sempre
> vindo do corpo da resposta da API (nunca reescrito no front), comentários em português explicando
> *por quê*. As decisões `F-xx` daqui e as `D-xx`/`RN-xxx` do plano-fonte já foram tomadas —
> implemente-as, não as reabra. Se o código atual contradisser este documento, **pare e reporte**.

### Fase 1 — Tipos e o bloco `settlement` no endpoint que já existe ✅

**Arquivos:** `src/types/acerto.ts` (novo), `src/types/notificationType.ts`,
`src/types/residencia.ts`, `src/lib/expensesApi.ts`, `src/lib/expensesApi.test.ts`

1. **`src/types/acerto.ts`** — os tipos normativos do C.6:
   ```ts
   export type StatusAcerto = 'PENDING' | 'AWAITING_CONFIRMATION' | 'SETTLED' | 'WAIVED';
   export type StatusFechamento = 'AWAITING_PAYMENT' | 'AWAITING_CONFIRMATION' | 'SETTLED';

   export interface ComprovantePagamento {
       id: string;
       contentType: string;
       sizeInBytes: number;
       originalName: string | null;
       uploadedAt: string;
       uploadedByName: string;
   }

   // "Meu acerto" resumido — o item de settlement.mine em GET /expenses (§6.7)
   export interface MeuAcerto {
       id: string;
       role: 'PAYER' | 'RECEIVER';
       counterpartyName: string;
       amountInCents: number;
       status: StatusAcerto;
   }

   export interface TotaisAcerto {
       payerSide: { lines: number; paid: number };
       receiverSide: { lines: number; confirmed: number };
   }

   // O bloco settlement embutido em GET /expenses — null se competência aberta
   // ou fechamento legado sem linhas (D-09).
   export interface AcertosDaCompetencia {
       status: StatusFechamento;
       totals: TotaisAcerto;
       mine: MeuAcerto[];
   }

   // Uma linha (par) da tela de acertos — GET .../closures/:period/settlements
   export interface Acerto {
       id: string;
       payer: { userId: number; name: string };
       receiver: { userId: number; name: string };
       amountInCents: number;
       isMinePaying: boolean;
       isMineReceiving: boolean;
       status: StatusAcerto;
       paidAt: string | null;
       confirmedAt: string | null;
       waivedAt: string | null;
       waiveReason: string | null;
       receipts: ComprovantePagamento[];
   }

   export interface ResumoAcertos {
       competencia: { month: number; year: number };
       closedAt: string;
       closedByName: string;
       status: StatusFechamento;
       settledAt: string | null;
       totals: TotaisAcerto;
       canAct: boolean;
       canUpload: boolean;
       acertos: Acerto[];
   }
   ```
2. **`src/types/notificationType.ts`** — acrescente `SETTLEMENT_PENDING`, `SETTLEMENT_READY`,
   `MONTH_SETTLED`, `SETTLEMENT_WAIVED` ao objeto `NotificationType`.
3. **`src/types/residencia.ts`** — acrescente `settlement: AcertosDaCompetencia | null` a
   `ResumoDespesas`. **Não** acrescente a `ResumoCompetencia` diretamente — essa interface é o
   formato que `PainelResidencia` recebe depois da remontagem manual do `page.tsx` (ver item 5);
   o campo entra nela também, mas como parte da Fase 2 (é lá que `ResumoDoMes` passa a consumi-lo).
4. **`src/lib/expensesApi.ts`** — em `ExpensesApiResponse`, acrescente:
   ```ts
   settlement: {
       status: StatusFechamento;
       totals: TotaisAcerto;
       mine: { id: string; role: 'PAYER' | 'RECEIVER'; counterpartyName: string; amountInCents: number; status: StatusAcerto }[];
   } | null;
   ```
   E em `getResidenceExpenses`, repasse `settlement: data.settlement` dentro de `resumo` (sem
   tradução de nomes — o bloco já está no formato que o `AcertosDaCompetencia` espera, é o único
   pedaço da resposta que não precisa de mapeamento EN→PT porque nasceu deste lado).
5. **`expensesApi.test.ts`** — dois casos novos: `settlement: null` passa como `null`;
   `settlement` populado (com `mine` de 2 itens) passa sem alteração de forma.

**Verificação:**
```bash
npm test -- expensesApi
```

### Fase 2 — O selo de 4 estados e o CTA de saldo (C.1) ✅

**Arquivos:** `src/utils/acerto.ts` (novo, F-19), `src/utils/acerto.test.ts`,
`src/app/dashboard/residences/[code]/page.tsx`,
`src/app/dashboard/residences/[code]/ResumoDoMes.tsx` (+ `.module.css`),
`src/app/dashboard/residences/[code]/ResumoDoMes.test.tsx` (novo),
`src/app/dashboard/residences/[code]/expenses/ConsultaDespesas.tsx` (+ `.module.css`),
`src/app/dashboard/residences/[code]/expenses/ConsultaDespesas.test.tsx` (novo)

Irmãos a imitar: o próprio `ResumoDoMes.tsx` (selo `fechado` atual, que este passo substitui) e
`ConsultaDespesas.tsx` (selo `Mês fechado` atual, que ganha um botão ao lado, sem ser removido).

1. **`src/utils/acerto.ts`** (F-19) — `descricaoSelo(isClosed, settlement)`:
   | Condição | Retorno |
   | :---- | :---- |
   | `!isClosed` | `null` |
   | `isClosed && settlement === null` | `{ texto: 'fechado', tom: 'neutro' }` |
   | `status === 'AWAITING_PAYMENT'` | `{ texto: `aguardando pagamento · ${paid} de ${lines}`, tom: 'atencao' }` |
   | `status === 'AWAITING_CONFIRMATION'` | `{ texto: `aguardando confirmação · ${confirmed} de ${lines}`, tom: 'atencao' }` (contagem do lado `receiverSide`) |
   | `status === 'SETTLED'` | `{ texto: 'mês quitado', tom: 'positivo' }` |

   Acrescente também `resumoMeusAcertos(mine: MeuAcerto[])`, que devolve o texto do CTA descrito
   em C.1 (soma por `role`, nunca mistura `PAYER` e `RECEIVER` — comente citando D-29) ou `null`
   se `mine` estiver vazio.
2. **`page.tsx`** — na remontagem do `resumo` passado a `PainelResidencia` (linhas 57–66 hoje),
   acrescente `settlement: resumo.settlement`. `ResumoCompetencia` (types/residencia.ts) ganha o
   campo `settlement: AcertosDaCompetencia | null` nesta fase.
3. **`ResumoDoMes.tsx`** — troca o `resumo.isClosed && <span>fechado</span>` fixo por
   `descricaoSelo(resumo.isClosed, resumo.settlement)`, com uma classe de cor por `tom` (siga as
   variáveis de `--pos`/`--atencao` já usadas em outras telas — confira `globals.css` antes de
   nomear a classe nova). No card de saldo pessoal, acrescente o CTA de `resumoMeusAcertos`, com
   um `<Link href="/dashboard/residences/{code}/settlements?mes={m}&ano={y}">Ver acertos</Link>`
   — a competência do link é a mesma `competencia` que o componente já recebe como prop.
4. **`ResumoDoMes.test.tsx`** — cobre os 4 estados do selo e a presença/ausência do CTA conforme
   `mine`.
5. **`ConsultaDespesas.tsx`** — ao lado do selo `Mês fechado` já existente (linha ~130), um botão
   "Ver acertos" quando `resumo.isClosed` (mesma condição do selo — **não** dependa de
   `resumo.settlement !== null`, porque um fechamento legado ainda deve linkar para uma tela que
   mostra "nada a acertar").
6. **`ConsultaDespesas.test.tsx`** — cobre a presença do botão só quando fechado, e o `href`
   correto com a competência em exibição (não necessariamente a aberta).

**Verificação:**
```bash
npm test -- acerto ResumoDoMes ConsultaDespesas
```
```bash
npm run build
```

### Fase 3 — Leitura da tela de acertos (Server Component + listagem read-only) ✅

**Arquivos:** `src/lib/acertosApi.ts` (novo), `src/lib/acertosApi.test.ts`,
`src/app/dashboard/residences/[code]/settlements/page.tsx` (novo),
`src/app/dashboard/residences/[code]/settlements/AcertosDaCompetencia.tsx` (novo, +
`.module.css`), `src/app/dashboard/residences/[code]/settlements/AcertosDaCompetencia.test.tsx`

Irmãos a imitar: [expensesApi.ts](../src/lib/expensesApi.ts) (client de leitura server-side) e
[expenses/page.tsx](../src/app/dashboard/residences/%5Bcode%5D/expenses/page.tsx) +
[ConsultaDespesas.tsx](../src/app/dashboard/residences/%5Bcode%5D/expenses/ConsultaDespesas.tsx)
(página fina delegando pro Client Component, competência lida de `searchParams`).

1. **`acertosApi.ts`** (F-12) — `getClosureSettlements(code, competencia): Promise<ResumoAcertos>`,
   usando `apiFetch` e traduzindo `payer`/`receiver`/`amountInCents`/etc. do §6.1 para o formato
   de `Acerto` da Fase 1. `404` (não-membro ou período sem fechamento) propaga como `ApiError` —
   a página trata como `notFound()`, igual `page.tsx` do painel já faz.
2. **`settlements/page.tsx`** — `searchParams: { mes, ano }`, mesmo padrão de
   `expenses/page.tsx`: sem `mes`/`ano`, usa a competência aberta como referência só para saber
   pra onde voltar (a tela de acertos em si não faz sentido sem competência fechada — se a
   competência pedida estiver aberta, `getClosureSettlements` devolve 404 e a página cai em
   `notFound()`, que é o comportamento correto: não existe acerto de competência aberta).
3. **`AcertosDaCompetencia.tsx`** (`'use client'`) — recebe `resumo: ResumoAcertos`,
   `residencia: Residencia`, `usuarioId: number` como props (Server Component busca, Client
   Component recebe pronto — mesmo desenho de `ConsultaDespesas`). Duas seções, como o mockup do
   C.2:
   - **"Seus acertos"** — filtra `acertos` por `isMinePaying || isMineReceiving`, cada linha com
     "Você deve → {receiver.name}" ou "Você tem a receber ← {payer.name}".
   - **"Todos os acertos do mês"** — ~~a lista inteira~~ **revisado**: só renderiza para
     `residencia.isOwner` (um membro comum só vê os próprios pares, em "Seus acertos") e, quando
     renderiza, lista apenas os pares que **não** estão em "Seus acertos" — a mesma linha nunca
     aparece nas duas seções.
   - **Cada linha mostra os dois indicadores independentes** (D-30): "comprovante anexado"
     (`paidAt`) e "recebimento confirmado" (`confirmedAt`) — nunca reduzidos a um selo só, porque
     RN-076 permite qualquer ordem entre os dois.
   - **Texto de ajuda sobre os pares** (custo de D-01=B, citado em C.2): uma linha discreta acima
     da lista, sempre visível (não é um "dica" dispensável — é a explicação de por que os pares
     não batem com quem gastou junto de quem).
   - `residencia.isArchived` desliga as ações (mostra os indicadores, esconde os botões) — mesmo
     padrão de `podeAlterar` em `ConsultaDespesas`.
4. **`AcertosDaCompetencia.test.tsx`** — renderiza com um `resumo` mockado (sem chamar API: o
   componente só recebe props nesta fase) cobrindo: separação seus/todos; os dois indicadores
   independentes por linha; texto de ajuda sempre presente; nenhuma ação renderizada quando
   `residencia.isArchived`.

**Verificação:**
```bash
npm test -- acertosApi AcertosDaCompetencia
```
```bash
npm run build
```

### Fase 4 — Confirmar recebimento (Server Action irreversível) ✅

**Arquivos:**
`src/app/dashboard/residences/[code]/settlements/confirmarRecebimentoAction.ts` (novo, + teste),
`src/app/dashboard/residences/[code]/settlements/AcertosDaCompetencia.tsx`,
`AcertosDaCompetencia.test.tsx`

Irmãos: [fecharMesAction.ts](../src/app/dashboard/residences/%5Bcode%5D/expenses/fecharMesAction.ts)
+ seu teste (F-13), e [ConfirmacaoModal.tsx](../src/app/dashboard/residences/%5Bcode%5D/ConfirmacaoModal.tsx)
já reaproveitado sem alteração.

1. **`confirmarRecebimentoAction.ts`** — `'use server'`, chama `POST
   /residences/{code}/closures/{period}/settlements/{settlementId}/confirm` sem corpo,
   `revalidatePath` da própria rota de acertos, retorno `ActionState`. Mensagem de erro sempre a
   da `ApiError` (nunca reescrita — mesmo princípio do F-08 da recuperação de senha).
2. **`AcertosDaCompetencia.tsx`** — nas linhas onde `isMineReceiving && status !== 'SETTLED' &&
   status !== 'WAIVED'`, um botão "Confirmar recebimento" que abre o `ConfirmacaoModal` com a
   mensagem nomeando o devedor e o valor (C.3): *"Confirmar que você recebeu R$ 219,10 de Letícia
   Rocha? Isso não pode ser desfeito."* — **nunca** "confirmar o pagamento" genérico, porque a
   pessoa pode ter mais de uma linha pendente.
   - Mostre as miniaturas dos comprovantes daquela linha **dentro do modal ou logo acima dele**,
     antes do botão (a integração completa do componente de miniatura é a Fase 8 — nesta fase,
     deixe o espaço reservado ou renderize só a contagem "2 comprovantes anexados" como
     placeholder textual, e troque pelo componente de verdade na Fase 8).
   - **Não bloqueie o botão** quando `paidAt` for `null` (RN-076) — no máximo um aviso discreto:
     *"{payer.name} ainda não anexou o comprovante deste pagamento."*
   - Em sucesso, `router.refresh()` (mesmo padrão de `ConsultaDespesas`/`PainelResidencia`).
3. **Teste** — clique abre o modal com o texto certo; confirmar chama a Server Action com o
   `settlementId` certo; erro da API aparece no snackbar/mensagem de erro; o botão nunca
   desaparece por falta de `paidAt`, só o aviso muda.

**Verificação:**
```bash
npm test -- confirmarRecebimentoAction AcertosDaCompetencia
```

### Fase 5 — Dispensar acerto (owner-only, motivo obrigatório) ✅

**Arquivos:**
`src/app/dashboard/residences/[code]/settlements/dispensarAcertoAction.ts` (novo, + teste),
`src/app/dashboard/residences/[code]/settlements/DispensarAcertoModal.tsx` (novo, + `.module.css`,
+ teste), `AcertosDaCompetencia.tsx`, `AcertosDaCompetencia.test.tsx`

Irmão: [EditarDespesaModal.tsx](../src/app/dashboard/residences/%5Bcode%5D/expenses/EditarDespesaModal.tsx)
(F-18 — form-modal, não `ConfirmacaoModal`).

1. **`dispensarAcertoAction.ts`** — `'use server'`, valida `reason` (3–200 caracteres — pode
   confiar na validação da API e só repassar o erro, sem duplicar Zod aqui; o campo já é
   controlado no client para o botão desabilitar antes de submeter), `POST .../settlements/:id/waive`
   com `{ reason }`, `revalidatePath`.
2. **`DispensarAcertoModal.tsx`** — `useActionState` + `Form` do `next/form`, campo de texto (não
   input — motivo pode ser longo, `<textarea maxLength={200}>`), contador de caracteres, botão
   desabilitado até 3 caracteres. Título "Dispensar acerto", corpo nomeando os dois lados do par
   (*"{payer.name} → {receiver.name}, R$ 219,10"*) e o aviso de que dispensa os dois lados de uma
   vez, mesmo que só um estivesse pendente.
3. **`AcertosDaCompetencia.tsx`** — botão "Dispensar" visível só quando `residencia.isOwner` e a
   linha não está `SETTLED`/`WAIVED`.
4. **Testes** — Server Action: motivo curto demais não deveria nem chegar a ser chamável (o botão
   do modal desabilita antes), mas cubra o `409`/`403` vindos da API mesmo assim (defesa em
   profundidade); modal: contador de caracteres, botão desabilitado/habilitado; componente: botão
   só aparece pro owner.

**Verificação:**
```bash
npm test -- dispensarAcertoAction DispensarAcertoModal AcertosDaCompetencia
```

### Fase 6 — Compressão de imagem no navegador (D-19, F-16) ✅

**Arquivos:** `src/utils/comprimirImagem.ts` (novo), `src/utils/comprimirImagem.test.ts`

1. `comprimirImagem(arquivo: File): Promise<File>`:
   - Se `arquivo.type === 'application/pdf'`, devolve o arquivo **sem alteração** — nunca passa
     pelo canvas.
   - Senão: `createImageBitmap(arquivo)` → desenha num `<canvas>` redimensionado (lado maior
     ~1600px, mantendo proporção) → `canvas.toBlob(..., 'image/webp', qualidade)` → `File` novo
     com `.webp` no nome e `type: 'image/webp'`.
   - Redesenhar no canvas descarta o EXIF (inclusive GPS) por construção — comente isso, porque
     não é óbvio olhando só o código (ninguém está "removendo EXIF" explicitamente).
2. **Teste (limitação conhecida, documente no arquivo de teste):** `jsdom` não implementa
   `createImageBitmap`/`canvas` de verdade. Cubra o que dá para cobrir sem navegador real: PDF
   passa direto (mock simples, sem precisar de canvas); a função lança um erro tratável se
   `createImageBitmap` não existir/falhar, em vez de travar silenciosamente. Se o ambiente de CI
   tiver `canvas` (pacote `node-canvas`) disponível via alguma dependência já instalada, teste
   também as dimensões de saída — senão, registre a lacuna em `backlog-e-casos-de-teste.md` na
   Fase 9, no mesmo espírito do F-10/F-17 (buraco de cobertura documentado, não esquecido).

**Verificação:**
```bash
npm test -- comprimirImagem
```

### Fase 7 — O upload de ponta a ponta: intenção → S3 → complete (D-28, F-14) ✅

**Arquivos:**
`src/app/dashboard/residences/[code]/settlements/useAnexarComprovante.ts` (novo, + teste),
`src/app/dashboard/residences/[code]/settlements/AnexarComprovanteInput.tsx` (novo, +
`.module.css`, + teste), `AcertosDaCompetencia.tsx`, `AcertosDaCompetencia.test.tsx`

Irmão para o padrão de chamada client: [useLogin.ts](../src/hooks/useLogin.ts).
**⚠️ Este arquivo não leva `'use server'` — F-14.**

1. **`useAnexarComprovante.ts`** — hook com os 4 passos do C.4, nesta ordem exata:
   ```ts
   async function anexar(residencia: string, periodo: string, settlementId: string, arquivoOriginal: File) {
     // 1) comprimir (Fase 6) — PDF passa direto
     const arquivo = await comprimirImagem(arquivoOriginal);

     // 2) intenção — apiFetchClient, mesma origem
     const { receiptId, upload } = await apiFetchClient<...>(
       `/residences/${residencia}/closures/${periodo}/settlements/${settlementId}/receipts`,
       { method: 'POST', body: { contentType: arquivo.type, sizeInBytes: arquivo.size, originalName: arquivo.name } },
     );

     // 3) S3 direto — fetch puro, file por ÚLTIMO no FormData, SEM credentials
     const form = new FormData();
     for (const [k, v] of Object.entries(upload.fields)) form.append(k, v);
     form.append('file', arquivo);
     await fetch(upload.url, { method: 'POST', body: form });

     // 4) completar — apiFetchClient de novo; em falha de rede AQUI, tentar de novo
     //    o passo 4, nunca o 3 (o objeto já está no bucket — C.4, armadilha nº4)
     return apiFetchClient(
       `/residences/${residencia}/closures/${periodo}/settlements/${settlementId}/receipts/${receiptId}/complete`,
       { method: 'POST' },
     );
   }
   ```
   - Estado exposto: `enviando`, `erro` (mensagens do C.7: `503` → "envio indisponível no
     momento"; `422` → "arquivo não pôde ser validado"; falha de rede no passo 3 → mensagem +
     **retenção do `receiptId`** para permitir "tentar de novo" sem refazer os passos 1–3).
   - **Validação client-side antes do passo 1:** tipo dentre os 4 aceitos e tamanho ≤ 5 MB — só
     para poupar uma ida e volta, a validação de verdade é da API/S3 (RN-081).
2. **`AnexarComprovanteInput.tsx`** — `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf">`,
   estado de progresso ("Comprimindo…" / "Enviando…" / "Confirmando…"), erro visível, botão
   "Tentar novamente" que rechama só o passo 4 quando o hook sinalizar que passos 1–3 já
   terminaram.
3. **`AcertosDaCompetencia.tsx`** — nas linhas onde `isMinePaying && status === 'PENDING'` (ou já
   tem `paidAt` mas o usuário quer anexar outro comprovante — D-11 permite N comprovantes), mostra
   `AnexarComprovanteInput`. Em sucesso, `router.refresh()`.
4. **Testes** — mocke `apiClient.client` (`jest.mock("@/lib/apiClient.client")`), mocke
   `comprimirImagem` (não testar compressão de novo aqui) e mocke `global.fetch` só para o passo
   3. Cubra: ordem das chamadas; `file` é o último campo do `FormData` do passo 3; o passo 3
   **não** usa `apiFetchClient`; nenhuma chamada usa `credentials: 'include'` no fetch do S3;
   falha no passo 3 não chama o passo 4; falha no passo 4 preserva o `receiptId` para retry; PDF
   não passa por `comprimirImagem` com transformação (chega ao passo 2 com o `type` original).

**Verificação:**
```bash
npm test -- useAnexarComprovante AnexarComprovanteInput AcertosDaCompetencia
```

### Fase 8 — Exibir o comprovante (URL sob demanda, F-15) ✅

**Arquivos:** `src/app/dashboard/residences/[code]/settlements/Comprovante.tsx` (novo, +
`.module.css`, + teste), `AcertosDaCompetencia.tsx`, `AcertosDaCompetencia.test.tsx`

1. **`Comprovante.tsx`** (`'use client'`) — recebe `receiptId` e `contentType`; ao montar, chama
   `apiFetchClient<{ url: string; expiresInSeconds: number }>(".../receipts/{id}/url")`. Enquanto
   carrega, um placeholder; em erro (comprovante removido, `404`), uma mensagem discreta em vez de
   quebrar a linha inteira. Para `application/pdf`, renderiza um link "Abrir comprovante (PDF)"
   com `target="_blank" rel="noopener"` — **nunca** tenta embutir; para os três tipos de imagem,
   `<img src={url}>` direto (sem `fetch` — é navegação de `<img>`, então não passa por CORS de
   leitura, coerente com a nota do §A.2 do plano-fonte).
   - **Nunca guarde a URL em estado que sobrevive à desmontagem** (nem contexto, nem cache do
     Next) — é exatamente o que D-25 proíbe.
2. **`AcertosDaCompetencia.tsx`** — troca os placeholders textuais da Fase 4 pelas miniaturas de
   verdade (`<Comprovante>` por item de `receipts[]`), exibidas antes do botão de confirmar, como
   o C.3 pede.
3. **Teste** — mocke `apiClient.client`; cubra: busca a URL ao montar; imagem renderiza `<img
   src>` com a URL devolvida; PDF renderiza link em nova aba, sem `<img>`; erro na busca mostra
   fallback sem quebrar o restante da lista.

**Verificação:**
```bash
npm test -- Comprovante AcertosDaCompetencia
```

### Fase 9 — Documentação ✅

**Arquivos:** `docs/backlog-e-casos-de-teste.md`, `README.md`

1. **`backlog-e-casos-de-teste.md`:**
   - "Backlog de funcionalidades" → nova seção "Acertos e comprovantes de pagamento" (ou dentro de
     "Despesas colaborativas", se o índice já tratar acerto como parte dela — confira antes de
     criar seção nova), no formato das linhas existentes, citando `US-032` a `US-036`/`FEAT-036` a
     `FEAT-038` do plano-fonte.
   - "Testes de componentes": os componentes novos (`AcertosDaCompetencia`, `Comprovante`,
     `DispensarAcertoModal`, `AnexarComprovanteInput`) e os hooks (`useAnexarComprovante`).
   - "O que ainda não está coberto": o buraco do E2E de upload (F-17), com a justificativa e o
     ponteiro para a suíte de integração da API; e, se a Fase 6 não conseguiu testar dimensões
     reais de compressão em CI, esse buraco também, com a mesma justificativa.
2. **`README.md`** — se houver seção de rotas/funcionalidades, acrescente `/settlements` no
   formato já em uso. Leia antes de escrever; não crie seção nova.
3. **Este documento** — marque as fases concluídas com ✅, como o plano da recuperação de senha
   fez.

**Verificação:**
```bash
npm run lint && npm test && npm run build
```

### Fase 10 — E2E (Cypress), com o escopo do F-17 ⚠️ escrito, não executado

`cypress/e2e/acertos-de-pagamento.cy.ts` foi escrito conforme o escopo abaixo, mas **não foi
rodado** — `npm run test:e2e` exige a API real no ar com os 6 endpoints e o bloco `settlement`
implementados, o que não está disponível nesta sessão (sem banco, sem API rodando). O arquivo foi
verificado com `npx tsc -p cypress/tsconfig.json --noEmit` (o mesmo "erro" de tipo aparece em
**todos** os specs Cypress já existentes no repositório — `clicarComSeguranca` tipado com
`Chainable<JQuery<HTMLElement>>` não aceita o retorno mais específico de `cy.contains('button',
...)`; não é uma regressão deste arquivo) e com `eslint`, ambos limpos. Rode `npm run test:e2e`
manualmente assim que a API estiver pronta.

**Arquivo:** `cypress/e2e/acertos-de-pagamento.cy.ts`

Irmão: [fechar-reabrir-mes.cy.ts](../cypress/e2e/fechar-reabrir-mes.cy.ts) (fluxo de fechamento já
coberto, este arquivo continua a partir de onde aquele para) e
[convite-membro.cy.ts](../cypress/e2e/convite-membro.cy.ts) (para o padrão de criar uma segunda
conta/membro, necessário aqui — um acerto exige pelo menos 2 pessoas com saldo ≠ zero).

Escopo, conforme F-17 — **não tenta cobrir o upload**:

1. Duas contas, uma residência, ao menos duas despesas lançadas de forma que gerem saldo ≠ zero
   entre os dois membros.
2. Owner fecha o mês (fluxo já validado por `fechar-reabrir-mes.cy.ts`) → o selo no painel mostra
   "aguardando pagamento".
3. Navegar para `/dashboard/residences/{code}/settlements` (pelo botão "Ver acertos") → a linha
   aparece com os dois indicadores independentes, nenhum marcado.
4. **Sem anexar comprovante nenhum**, o credor confirma o recebimento (RN-076 permite) → a linha
   mostra "recebimento confirmado", ainda não `SETTLED` (falta o `paidAt` do devedor).
5. Um comentário no topo do arquivo, no mesmo formato do `recuperar-senha.cy.ts`, explicando que
   o upload de comprovante (D-28, fala direto com o S3) **não** é coberto aqui, e apontando para
   `tests/integration/settlements.test.ts` no repositório da API como a cobertura real desse
   caminho.

**Verificação:**
```bash
npm run test:e2e
```
⚠️ Requer a API real no ar com a feature em produção — os 6 endpoints e o bloco `settlement` de
`GET /expenses`, já prontos do lado da API (Parte B concluída). Não requer bucket S3 configurado,
porque este arquivo não faz upload.

---

## Checklist de aceite (reportar item a item)

- [x] O selo da competência mostra os 4 estados de C.1 **sem** requisição extra além de
      `GET /expenses` — F-19 / Fase 1-2
- [x] A tela de acertos lista **pares**, não pessoas, com os dois indicadores independentes por
      linha — D-30 / Fase 3
- [x] Confirmar recebimento nunca fica bloqueado por falta do comprovante do devedor (RN-076) —
      Fase 4
- [x] Dispensar é só do owner, exige motivo de 3–200 caracteres, dispensa os dois lados de uma vez
      — RN-082 / Fase 5
- [x] O upload roda inteiramente no client, **não** é Server Action — F-14 / Fase 7
- [x] No passo 3 do upload, `file` é o último campo do `FormData` e não há `credentials: 'include'`
      — C.4 / Fase 7
- [x] Falha de rede depois do S3 tenta de novo o passo 4, nunca o passo 3 — C.4 / Fase 7
- [x] A URL do comprovante é buscada no client, sob demanda, nunca cacheada — D-25 / F-15 / Fase 8
- [x] PDF nunca passa pela compressão de imagem — Fase 6-7
- [x] Nenhum item novo entra na navegação do `AppShell` — C.2, já confirmado na análise
- [x] Mensagens de erro vêm do corpo da resposta da API, nunca reescritas no front — **com as duas
      exceções que o próprio C.7 manda escrever** (`503` e `422` do upload, `useAnexarComprovante.ts`);
      todo o resto (Server Actions, `Comprovante.tsx`, `acertosApi.ts`) repassa `error.message` sem
      reinterpretar
- [x] O buraco de cobertura do upload no E2E está escrito no `backlog-e-casos-de-teste.md` — F-17
- [x] `npm run lint && npm test && npm run build` verdes, incluindo todos os testes que já existiam
- [ ] `npm run test:e2e` — **não executado nesta sessão** (sem API/banco disponíveis). Rode
      manualmente quando a API estiver no ar (Fase 10)
