# Funcionalidade: Pagamentos

> **Status:** proposta para discussão. Nada implementado.
> Este documento estrutura a ideia para você revisar, ajustar e autorizar depois.

---

## 1. O problema

Hoje o Cronos vai até o rateio e para. A tela de Relatórios calcula quanto cada
morador gastou, qual é a cota individual e quem paga/recebe quanto. Mas o que
acontece depois disso é invisível para o sistema:

- Ninguém sabe se a Letícia realmente pagou o Gabriel.
- Se ela pagou por Pix, o comprovante fica no WhatsApp e some no histórico do grupo.
- "Fechar o mês" hoje significa apenas *travar os lançamentos* — não significa que
  as contas foram acertadas.

Ou seja: o app resolve o **cálculo**, mas o **acerto** continua fora dele. É
justamente no acerto que mora o atrito social ("já te mandei", "não caiu ainda",
"manda o print de novo").

## 2. O que a funcionalidade faz

Fecha o ciclo. Depois que o mês é fechado, o rateio vira uma lista de **pagamentos
pendentes**. Cada pagamento tem duas pontas:

- **Quem paga** vê quanto deve, para quem, e anexa o comprovante.
- **Quem recebe** vê o comprovante e confirma que o dinheiro caiu.

Quando todos os pagamentos estão confirmados, o mês passa de *fechado* para
**consolidado** — e os comprovantes ficam arquivados, acessíveis a qualquer momento.

### Os três estados de uma competência

| Estado | O que significa | Como chega aqui |
|---|---|---|
| **Aberta** | Aceita novos lançamentos | Estado inicial |
| **Fechada** | Lançamentos travados, rateio congelado, pagamentos gerados | Owner clica em "Fechar mês" |
| **Consolidada** | Todos os pagamentos confirmados pelos recebedores | Último recebedor confirma |

O passo de *fechada → consolidada* é novo. Hoje o ciclo termina em "fechada".

---

## 3. Decisão de projeto: quantos pagamentos gerar?

Esta é a decisão mais importante do desenho, porque define quantas transferências
os moradores farão na prática.

Com 4 pessoas onde 2 recebem e 2 pagam, existem duas abordagens:

### Opção A — Cada devedor paga cada credor (proporcional)
Gera até `devedores × credores` pagamentos. No exemplo: 4 transferências.

- ✅ Matematicamente óbvio: cada um paga proporcionalmente a cada credor
- ❌ Muitas transferências pequenas e esquisitas (R$ 73,41 para um, R$ 35,27 para outro)

### Opção B — Minimizar o número de transferências (recomendada)
Um algoritmo guloso casa o maior devedor com o maior credor até zerar todos.
No exemplo: **2 transferências**.

- ✅ Muito menos atrito: cada pessoa faz 1 Pix, não 3
- ✅ É o que Splitwise e Tricount fazem ("simplify debts")
- ❌ Os pares são arbitrários — a Letícia pode acabar pagando alguém com quem não
  interagiu no mês. Precisa de uma frase explicando na UI.

**Recomendação:** Opção B. O ganho de usabilidade é grande e o "estranhamento" se
resolve com uma linha de texto ("O Cronos escolheu o menor número de transferências
possível — o total que você paga é o mesmo").

> Nota: eu havia proposto um card "Como quitar em 2 transferências" nos protótipos e
> você pediu para remover porque tinha uma ideia melhor. Se a sua ideia for
> diferente desta, o algoritmo abaixo é a parte descartável — o resto do documento
> (comprovantes, confirmação, storage) permanece válido.

### Esboço do algoritmo (Opção B)

```
saldos = [(usuário, saldoInCents)]  // positivo = recebe, negativo = paga

enquanto existir saldo != 0:
    maiorCredor  = max(saldos)
    maiorDevedor = min(saldos)
    valor = min(maiorCredor.saldo, -maiorDevedor.saldo)

    criar Pagamento(de: maiorDevedor, para: maiorCredor, valor)

    maiorCredor.saldo  -= valor
    maiorDevedor.saldo += valor
```

Garante no máximo `n - 1` transferências para `n` pessoas.

**Cuidado com arredondamento:** a cota individual é `total / n`, que quase nunca
divide exato. Hoje o sistema já convive com uma sobra de centavos (vi isso ao montar
os protótipos: os saldos somavam R$ 0,02 em vez de zero). Ao gerar pagamentos, essa
sobra precisa ser absorvida deliberadamente — sugestão: joga os centavos residuais no
maior pagamento e documenta a regra, senão o mês nunca consolida porque sobra R$ 0,01.

---

## 4. Modelo de dados

### Nova entidade: `Payment`

```
Payment
├── id                  UUID
├── residenceId         FK  → Residence
├── month, year         int (a competência que está sendo acertada)
├── payerId             FK  → User   (quem deve)
├── payeeId             FK  → User   (quem recebe)
├── amountInCents       int          (sempre positivo)
├── status              enum: PENDING | AWAITING_CONFIRMATION | CONFIRMED | DISPUTED
├── receiptKey          string?      (chave do objeto no storage; null até anexar)
├── receiptUploadedAt   timestamp?
├── confirmedAt         timestamp?
├── confirmedById       FK → User?   (deve ser igual a payeeId)
├── note                string?      (ex.: "paguei em dinheiro")
├── createdAt
└── updatedAt
```

**Índices sugeridos:** `(residenceId, year, month)` para montar a tela;
`(payerId, status)` e `(payeeId, status)` para as pendências de cada usuário.

**Constraints no banco, não só na aplicação:**
- `amountInCents > 0`
- `payerId != payeeId`
- `UNIQUE(residenceId, month, year, payerId, payeeId)` — evita pagamento duplicado
  se o fechamento for disparado duas vezes

### Máquina de estados

```
PENDING ──────────────────► AWAITING_CONFIRMATION ──────► CONFIRMED
   │  (pagador anexa                                       ▲
   │   comprovante)                                        │
   │                                                       │
   └───────────────────────────────────────────────────────┘
        (recebedor confirma direto, sem comprovante:
         caso "me pagou em dinheiro na minha frente")

AWAITING_CONFIRMATION ──► DISPUTED  (recebedor diz "não recebi")
DISPUTED ──► AWAITING_CONFIRMATION  (pagador reenvia comprovante)
```

O estado `DISPUTED` é importante: sem ele, a única saída de um comprovante errado é
o recebedor confirmar algo que não recebeu, ou o mês travar para sempre.

### Alteração em `Competency` / fechamento

Adicionar `consolidatedAt: timestamp?`. Preenchido automaticamente quando o último
`Payment` da competência vira `CONFIRMED`.

---

## 5. Onde guardar os comprovantes

Esta é a decisão de infraestrutura da funcionalidade. Comprovante é **dado sensível**
— tem nome, valor, banco e às vezes CPF parcial. Não pode ser um arquivo público
com URL adivinhável.

### Comparativo

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **MinIO** (recomendado p/ começar) | S3-compatível, self-hosted, sobe em 1 container Docker | Zero custo, roda no mesmo `docker-compose` do Postgres, API idêntica à da AWS — migrar para S3 depois é trocar env var | Você opera o serviço (backup, disco, uptime) |
| **AWS S3 / Cloudflare R2** | Storage gerenciado | Sem operação, durabilidade alta, R2 não cobra egress | Custo (baixo, mas existe), dependência de conta cloud |
| **Banco de dados (BYTEA)** | Blob direto no Postgres | Backup junto com os dados, transacional | Incha o banco, deixa dump/restore lento, péssimo para servir imagem |
| **Filesystem local** | Pasta no servidor | Simples | Não sobrevive a redeploy em container, não escala horizontalmente |

**Recomendação:** MinIO em desenvolvimento e produção inicial, com a camada de acesso
escrita contra a **API do S3** (SDK `@aws-sdk/client-s3`). Assim, se um dia migrar
para R2 ou S3, muda-se o endpoint e as credenciais — nada de código.

### Regras de segurança inegociáveis

1. **Bucket privado.** Nunca `public-read`.
2. **URLs pré-assinadas** com expiração curta (5–15 min), geradas sob demanda pela
   API depois de checar se o usuário é membro daquela residência.
3. **Chave do objeto não adivinhável**: `residences/{residenceId}/{year}-{month}/{paymentId}/{uuid}.jpg`.
   O `paymentId` sozinho não basta se for sequencial.
4. **Validar no servidor**: tipo MIME real (não a extensão), tamanho máximo
   (sugestão: 5 MB), e formatos aceitos (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
5. **Autorização por membro**: quem não é membro da residência recebe 404, não 403 —
   mesma regra que a RN-010 já aplica para residências.

### Fluxo de upload sugerido

```
1. Front  → API:      POST /payments/:id/receipt/upload-url
2. API validações:    é membro? é o payer? o pagamento está PENDING/DISPUTED?
3. API    → Front:    { uploadUrl (pré-assinada, PUT), receiptKey }
4. Front  → MinIO:    PUT direto no storage (o arquivo não passa pela API)
5. Front  → API:      POST /payments/:id/receipt/confirm { receiptKey }
6. API:               grava receiptKey, status = AWAITING_CONFIRMATION, notifica o payee
```

O upload direto ao storage (passo 4) evita que a API vire gargalo de banda. Se
preferir simplicidade sobre performance no começo, dá para o arquivo passar pela
API — mas aí vale limitar bem o tamanho.

---

## 6. Fluxos de usuário

### 6.1 Owner fecha o mês

```
Relatórios → "Fechar o mês"
   ↓
Modal de confirmação, agora mais explícito:
   "As despesas de Agosto ficarão somente leitura e o Cronos vai gerar
    2 pagamentos para acertar as contas. Todos serão avisados."
   ↓
Backend: trava lançamentos + calcula rateio + gera os Payment
   ↓
Notificação para todos: "Agosto fechado. Você deve R$ 326,72 para o Gabriel."
```

### 6.2 Quem paga

Nova aba **Pagamentos** dentro da residência.

```
┌─────────────────────────────────────────┐
│  Agosto de 2026        [Fechado]        │
│                                         │
│  VOCÊ PRECISA PAGAR                     │
│  ┌─────────────────────────────────┐    │
│  │ Para Gabriel Mizael             │    │
│  │ R$ 326,72                       │    │
│  │ [ Anexar comprovante ]          │    │
│  │ Já paguei em dinheiro →         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Ao anexar: preview da imagem antes de enviar, barra de progresso, e o card passa a
"Aguardando confirmação do Gabriel" com o comprovante visível em miniatura.

O link discreto **"Já paguei em dinheiro"** cobre o caso real de quem acertou fora do
app: envia sem comprovante, com uma nota opcional. O recebedor ainda precisa confirmar.

### 6.3 Quem recebe

```
┌─────────────────────────────────────────┐
│  VOCÊ VAI RECEBER                       │
│  ┌─────────────────────────────────┐    │
│  │ De Letícia Rocha                │    │
│  │ R$ 326,72                       │    │
│  │ [miniatura do comprovante]      │    │
│  │ enviado há 2 horas              │    │
│  │                                 │    │
│  │ [ Confirmar recebimento ]       │    │
│  │ Não recebi →                    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- **Confirmar** → `CONFIRMED`. Se era o último, a competência consolida e todos são avisados.
- **Não recebi** → `DISPUTED`, com campo de motivo. O pagador é notificado e pode reenviar.

**Ponto de atenção de UX:** confirmar recebimento é irreversível na prática (você
declarou que o dinheiro caiu). Vale um modal de confirmação — o mesmo padrão que
`ConfirmacaoModal.tsx` já implementa no projeto.

### 6.4 Consultar comprovantes depois

Requisito seu: "precisam estar disponíveis para o usuário acessar quando quiser".

Duas portas de entrada:
1. **Por competência** — abrir um mês consolidado mostra os pagamentos com os comprovantes.
2. **Histórico do usuário** — em "Minha conta", uma lista de todos os pagamentos
   (feitos e recebidos), filtrável por residência e período.

Comprovante **nunca é apagado** junto com o pagamento. Se a residência for arquivada,
os comprovantes continuam acessíveis a quem era membro — é registro financeiro.

---

## 7. Endpoints sugeridos

```
GET    /residences/:code/payments?month=&year=
       → lista os pagamentos da competência (só membros)

POST   /payments/:id/receipt/upload-url
       → devolve URL pré-assinada (só o payer)

POST   /payments/:id/receipt/confirm
       → grava a chave, status → AWAITING_CONFIRMATION (só o payer)

POST   /payments/:id/mark-as-paid
       → sem comprovante ("paguei em dinheiro"), status → AWAITING_CONFIRMATION

POST   /payments/:id/confirm
       → status → CONFIRMED (só o payee)

POST   /payments/:id/dispute   { reason }
       → status → DISPUTED (só o payee)

GET    /payments/:id/receipt
       → URL pré-assinada de leitura, curta (só payer, payee ou owner)

GET    /users/me/payments?page=
       → histórico do usuário entre residências
```

Todos seguem o padrão REST que o projeto já usa, e a autorização é sempre da API —
nunca do front (o `proxy.ts` só checa presença de sessão, como já documentado).

---

## 8. Impacto no que já existe

| Área | Mudança |
|---|---|
| `fecharMesAction.ts` | Passa a gerar os `Payment` além de travar a competência |
| `reabrirMesAction.ts` | **Precisa decidir**: reabrir apaga pagamentos? E se já houver comprovante? Sugestão: bloquear reabertura se qualquer pagamento estiver `CONFIRMED` |
| `AppShell.tsx` | Novo item "Pagamentos" na navegação da residência (rail + tab bar) — a tab bar do mobile já está com 4 itens, então algo precisa sair ou virar menu |
| Notificações | Novos tipos: pagamento gerado, comprovante enviado, recebimento confirmado, pagamento contestado |
| `types/` | Novo `payment.ts` |
| Infra | `docker-compose` ganha o serviço MinIO + variáveis de ambiente |

O item da tab bar é um detalhe real: hoje são 4 (Painel, Despesas, Relatórios, Conta).
Adicionar Pagamentos exige escolher — talvez Pagamentos entre e Conta vire item do
avatar no topo.

---

## 9. Sugestão de faseamento

Se decidir tocar, dá para entregar em partes utilizáveis:

**Fase 1 — Acerto sem comprovante**
Gera os pagamentos no fechamento, mostra a lista, permite marcar como pago e
confirmar. Sem storage nenhum. Já resolve 70% do problema e não exige infra nova.

**Fase 2 — Comprovantes**
Sobe o MinIO, adiciona upload e visualização. É aqui que entra a complexidade de infra.

**Fase 3 — Histórico e disputas**
Tela de histórico do usuário, fluxo de contestação, notificações completas.

Começar pela Fase 1 tem uma vantagem: valida se o fluxo de confirmação faz sentido
para os moradores **antes** de você investir em storage de arquivos.

---

## 10. Perguntas em aberto (para você decidir)

1. **Algoritmo de pagamentos:** minimizar transferências (Opção B) ou proporcional
   (Opção A)? Você mencionou ter uma ideia melhor — qual é?
2. **Reabrir mês com pagamentos confirmados:** bloquear, ou permitir e reverter?
3. **Quem pode contestar:** só o recebedor, ou o owner também pode intervir?
4. **Retenção:** comprovante fica para sempre? Se um usuário sair da residência,
   ele ainda vê os comprovantes dos meses em que participou? (Minha sugestão: sim.)
5. **Pix integrado:** vale gerar QR Code / copia-e-cola do Pix do recebedor?
   Exigiria guardar chave Pix no perfil — mais dado sensível, mais responsabilidade.
6. **Tab bar do mobile:** o que sai para Pagamentos entrar?
