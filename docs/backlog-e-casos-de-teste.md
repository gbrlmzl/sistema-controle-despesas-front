# 🧪 Backlog de funcionalidades e casos de teste

Este documento tem dois objetivos: (1) listar as funcionalidades do sistema como um backlog, sinalizando o que já tem teste automatizado no front-end e o que ainda não tem; (2) documentar, um a um, os casos de teste escritos até agora — o que cada arquivo testa e por quê.

Cobre **apenas o front-end** (este repositório). A suíte da API tem sua própria cobertura, documentada no repositório dela.

---

## 📑 Índice

- [Backlog de funcionalidades](#-backlog-de-funcionalidades)
- [Tecnologias utilizadas nos testes](#-tecnologias-utilizadas-nos-testes)
- [Testes de funções puras](#-testes-de-funções-puras)
- [Testes de componentes](#-testes-de-componentes)
- [Adaptações e decisões técnicas](#-adaptações-e-decisões-técnicas)
- [O que ainda não está coberto](#-o-que-ainda-não-está-coberto)

---

## ✅ Backlog de funcionalidades

Mesma organização por épico do [`README`](../README.md#-funcionalidades). A coluna **Cobertura** indica o tipo de teste que hoje protege a funcionalidade:

- 🧪 **função pura** — regra de negócio isolada (formatação, validação, cálculo) testada sem UI
- 🧩 **componente** — interação de usuário testada com Testing Library + `user-event`
- ⬜ **sem teste automatizado ainda** — validação hoje é manual, ou é candidata a E2E (ver [O que ainda não está coberto](#-o-que-ainda-não-está-coberto))

### Conta e identidade

| Funcionalidade | Cobertura |
|---|---|
| Cadastro (nome, username, e-mail, senha) | 🧩 `RegisterForm.test.tsx` + 🧪 `usuarios.test.ts` |
| Login por `username` | 🧩 `LoginForm.test.tsx` |
| Login com Google (OAuth) | ⬜ |
| Recuperação de senha (esqueci minha senha) | 🧩 `EsqueciSenhaForm.test.tsx` + `RedefinirSenhaForm.test.tsx` + 🧪 `usuarios.test.ts` (`esqueciSenhaSchema`, `redefinirSenhaSchema`) |
| Identificador público (`username`) | 🧪 `usuarios.test.ts` (`usernameSchema`) |
| Perfil (nome, avatar) | ⬜ |
| Alterar senha | ⬜ (mesmo padrão de `RegisterForm`, ainda não replicado) |

### Residências

| Funcionalidade | Cobertura |
|---|---|
| Criar residência | 🧪 `residencias.test.ts` (`residenceNameSchema`) — componente `CriarResidenciaForm` ainda não testado |
| Entrar por código | 🧩 `EntrarResidenciaForm.test.tsx` + 🧪 `residencias.test.ts` (`residenceCodeSchema`) |
| Normalização de código (maiúsculas/trim) | 🧪 `residenceCode.test.ts` |
| Listar residências | ⬜ |
| Painel da residência | ⬜ |
| Renomear / arquivar | ⬜ |
| Sair da residência | ⬜ |
| Remover membro | ⬜ |
| Transferir propriedade | ⬜ |
| Regenerar código | ⬜ |

### Acesso: convites e solicitações

| Funcionalidade | Cobertura |
|---|---|
| Solicitação por código | 🧩 `EntrarResidenciaForm.test.tsx` |
| Convite por `username` | ⬜ |
| Cancelamento de convite/solicitação | ⬜ |
| Central de notificações | ⬜ (usa `formatarMomento`, testado isoladamente) |
| Tempo relativo ("há 2 horas") | 🧪 `formatarMomento.test.ts` |

### Despesas colaborativas

| Funcionalidade | Cobertura |
|---|---|
| Lançar despesa | 🧩 `CadastrarDespesaForm.test.tsx` |
| Conversão de valor digitado → centavos | 🧪 `dinheiro.test.ts` (`parseValorParaCentavos`) |
| Formatação de valor em BRL | 🧪 `dinheiro.test.ts` (`formatarValor`) |
| Categoria (rótulo, opções) | 🧪 `categorias.test.ts` + `despesas.test.ts` |
| Competência (texto/curta) | 🧪 `categorias.test.ts` |
| Consultar por competência | ⬜ |
| Editar / excluir despesa | ⬜ |
| Despesa recorrente | ⬜ |
| Fechar / reabrir mês | ⬜ |

### Acertos e comprovantes de pagamento

Ver [`docs/plano-registro-de-pagamentos-frontend.md`](./plano-registro-de-pagamentos-frontend.md) para o plano completo (contrato da API, decisões `F-xx`, fases).

| Funcionalidade | Cobertura |
|---|---|
| Selo de 4 estados da competência (badge no painel) | 🧪 `acerto.test.ts` (`descricaoSelo`, `resumoMeusAcertos`) + 🧩 `ResumoDoMes.test.tsx` |
| Link "Ver acertos" na tela de despesas | 🧩 `ConsultaDespesas.test.tsx` |
| Leitura da lista de acertos (pares devedor→credor) | 🧪 `acertosApi.test.ts` + 🧩 `AcertosDaCompetencia.test.tsx` |
| Confirmar recebimento (credor, irreversível) | 🧩 `AcertosDaCompetencia.test.tsx` (Server Action `confirmarRecebimentoAction` testada à parte) |
| Dispensar acerto (owner, motivo obrigatório) | 🧩 `DispensarAcertoModal.test.tsx` + `AcertosDaCompetencia.test.tsx` (Server Action `dispensarAcertoAction` testada à parte) |
| Compressão de imagem no navegador | 🧪 `comprimirImagem.test.ts` (⚠️ orquestração testada com mocks das APIs do navegador — ver [O que ainda não está coberto](#-o-que-ainda-não-está-coberto)) |
| Upload do comprovante (intenção → S3 → complete) | 🧩 `useAnexarComprovante.test.ts` + `AnexarComprovanteInput.test.tsx` |
| Exibir comprovante (URL pré-assinada sob demanda) | 🧩 `Comprovante.test.tsx` |

### Relatórios e análise

| Funcionalidade | Cobertura |
|---|---|
| Relatório por categoria | ⬜ |
| Comparativo entre meses | ⬜ |
| Gráficos (Recharts) | ⬜ |
| Rateio entre membros | ⬜ |
| Exportar CSV | 🧪 `csv.test.ts` (`gerarCsv`) |
| Compartilhar imagem (PNG) | ⬜ — depende de `fetch`/`canvas`/DOM, fora do escopo de teste unitário (ver [O que ainda não está coberto](#-o-que-ainda-não-está-coberto)) |

### Transversal

| Item | Cobertura |
|---|---|
| Tratamento de erro da API (`ApiError`) | 🧪 `apiError.test.ts` |
| Whitelist de avatares | 🧪 `avatars.test.ts` |

---

## 🧰 Tecnologias utilizadas nos testes

| Tecnologia | Versão | Papel |
|---|---|---|
| **Jest** | 30 | Test runner: descoberta, execução, assertions (`expect`), mocks (`jest.mock`), fake timers |
| **`next/jest`** | (via `next`) | Gera a config do Jest a partir do `next.config.ts`, usando o **SWC** do próprio Next.js para transformar TS/JSX — sem depender de Babel. Também resolve CSS Modules e imagens automaticamente |
| **`jest-environment-jsdom`** | 30 | Ambiente de execução que simula o DOM do navegador (necessário para qualquer teste que renderize componentes) |
| **`@testing-library/react`** | 16 | Renderiza componentes React em memória (`render`) e expõe `screen` para consultar o DOM como um usuário veria (por texto, `role`, `alt`) |
| **`@testing-library/jest-dom`** | 7 | Estende o `expect` com matchers de DOM (`toBeInTheDocument`, `toBeDisabled`, `toHaveValue`, `toBeEmptyDOMElement`...). Carregado globalmente via [`jest.setup.ts`](../jest.setup.ts) |
| **`@testing-library/user-event`** | 14 | Simula interação real do usuário (`type`, `click`, `selectOptions`) disparando a sequência completa de eventos do navegador, não só um evento sintético isolado |
| **`@types/jest`** | 30 | Tipagem dos globais do Jest (`describe`, `it`, `expect`, `jest`...), permitindo usá-los sem import explícito (ver [Adaptações](#-adaptações-e-decisões-técnicas)) |
| **Zod** | 4 | Já usada em produção para os schemas de validação — os testes de schema chamam `.safeParse()` diretamente, sem nenhuma dependência extra de teste |
| **date-fns** | 4 | Usada nos testes de `formatarMomento` para construir datas fixas (`subHours`, `addDays`) a partir de um "agora" controlado por fake timers |

---

## 🧪 Testes de funções puras

Testam **regras de negócio isoladas**: entrada → saída, sem renderizar UI. Ficam colocados ao lado do módulo que testam (`nome.test.ts` ao lado de `nome.ts`).

| Arquivo | Módulo testado | O que é verificado |
|---|---|---|
| [`src/utils/dinheiro.test.ts`](../src/utils/dinheiro.test.ts) | `formatarValor`, `parseValorParaCentavos` | Formatação de centavos em BRL (incluindo negativos, zero e valores não finitos); parsing de texto digitado (vírgula, ponto, milhar, prefixo `R$`, espaços, texto inválido, tipos não string/number) |
| [`src/utils/categorias.test.ts`](../src/utils/categorias.test.ts) | `rotuloCategoria`, `nomeDoMes`, `competenciaTexto`, `competenciaCurta` | Rótulo de cada categoria válida e fallback para categoria desconhecida; nome do mês por extenso e limites do intervalo 1–12; composição do texto de competência (longo e curto) |
| [`src/utils/formatarMomento.test.ts`](../src/utils/formatarMomento.test.ts) | `formatarMomento` | Tempo relativo passado (`há`) e futuro (`em`), string vazia sem data, aceitação de `Date`/string ISO/timestamp — usando **fake timers** para fixar o "agora" |
| [`src/utils/csv.test.ts`](../src/utils/csv.test.ts) | `gerarCsv` | Separador `;`, escaping de aspas duplas, `CRLF` entre linhas, BOM no início (para o Excel abrir os acentos corretamente), valores nulos/indefinidos viram campo vazio |
| [`src/lib/residenceCode.test.ts`](../src/lib/residenceCode.test.ts) | `normalizeResidenceCode` | Uppercase, trim de espaços, e retorno de string vazia para valores que não são string |
| [`src/lib/avatars.test.ts`](../src/lib/avatars.test.ts) | `isValidAvatar` | Todos os avatares da whitelist são aceitos; caminho fora da lista (incluindo tentativa de path traversal / URL externa) é rejeitado |
| [`src/lib/apiError.test.ts`](../src/lib/apiError.test.ts) | `ApiError`, `parseApiResponse` | `ApiError` guarda `status`/`message`/`name` corretamente; `parseApiResponse` trata status `204` sem ler corpo, devolve o JSON em sucesso, e lança `ApiError` com a mensagem da API (ou mensagem padrão quando o corpo não tem `message` ou não é JSON válido) |
| [`src/schemas/despesas.test.ts`](../src/schemas/despesas.test.ts) | `despesaSchema` (Zod) | Aceita despesa válida; rejeita nome fora de 2–60 caracteres, valor não inteiro ou ≤ 0, categoria fora do enum |
| [`src/schemas/usuarios.test.ts`](../src/schemas/usuarios.test.ts) | `usernameSchema`, `registerSchema`, `esqueciSenhaSchema`, `redefinirSenhaSchema` (Zod) | Regras do username (tamanho, `a-z0-9_`); cadastro completo, incluindo e-mail inválido, senha fraca (sem dígito/símbolo) e confirmação de senha divergente (com verificação do `path` do erro); email válido/inválido em `esqueciSenhaSchema`; token vazio, senha fraca e confirmação divergente em `redefinirSenhaSchema` |
| [`src/schemas/residencias.test.ts`](../src/schemas/residencias.test.ts) | `residenceNameSchema`, `criarResidenciaSchema`, `residenceCodeSchema`, `entrarResidenciaSchema` (Zod) | Regras do nome da residência (tamanho, caracteres permitidos, trim) e do código (exatamente 6 caracteres `A-Z0-9`) |
| [`src/utils/linkNotificacao.test.ts`](../src/utils/linkNotificacao.test.ts) | `linkNotificacao` | Destino padrão para `linkTo` nulo ou `/app`; tradução de `/app/**` (formato antigo) para `/dashboard/**`; links já no formato novo passam intactos; `linkTo` de `SETTLEMENT_PENDING`/`SETTLEMENT_READY` traduzido corretamente; `JOIN_REQUEST_RECEIVED` redireciona para `/members/requests` (formato novo e antigo), outros tipos não são afetados |
| [`src/lib/expensesApi.test.ts`](../src/lib/expensesApi.test.ts) | `getResidenceCompetencies`, `getResidenceExpenses` | Conversão da resposta da API para o formato do `SeletorCompetencia`; repasse do bloco `settlement` (null e preenchido) sem alteração — é o que alimenta o selo de 4 estados sem requisição extra (C.1) |
| [`src/lib/acertosApi.test.ts`](../src/lib/acertosApi.test.ts) | `getClosureSettlements` | Monta o `:period` no formato `AAAA-MM`; traduz os pares devolvidos pela API preservando os dois carimbos independentes (`paidAt`/`confirmedAt`, D-30); devolve `null` em `404` (não-membro ou competência sem fechamento) em vez de propagar, para a página cair em `notFound()` |
| [`src/utils/acerto.test.ts`](../src/utils/acerto.test.ts) | `descricaoSelo`, `resumoMeusAcertos` | Os 4 estados do selo da competência (C.1), incluindo os dois tons distintos de "atenção"; a chamada de saldo (`Ver acertos`) só aparece com alguma linha `PENDING`, somando corretamente por papel (payer/receiver) |
| [`src/utils/comprimirImagem.test.ts`](../src/utils/comprimirImagem.test.ts) | `calcularDimensoes`, `comprimirImagem` | Redução proporcional do lado maior sem nunca ampliar; PDF passa direto, sem `createImageBitmap`; imagem é redesenhada no canvas e sai como WebP; erros de `createImageBitmap`/`canvas.toBlob` viram mensagens tratáveis. ⚠️ Ver [O que ainda não está coberto](#-o-que-ainda-não-está-coberto) |

**Total:** 15 arquivos, 105 casos de teste.

---

## 🧩 Testes de componentes

Testam **comportamento visível ao usuário**: o que aparece na tela e como o componente reage a digitação/clique/seleção. Usam `render` + `screen` (Testing Library) e `userEvent.setup()` para simular interação real.

| Arquivo | Componente | O que é verificado |
|---|---|---|
| [`src/components/ui/Snackbar.test.tsx`](../src/components/ui/Snackbar.test.tsx) | `Snackbar` | Não renderiza nada fechado; exibe a mensagem aberto; chama `onClose` ao clicar em fechar; permanece montado durante o fade-out e desmonta 300ms depois (fake timers); cor de fundo muda conforme o `type` |
| [`src/app/(auth)/register/RegisterForm.test.tsx`](<../src/app/(auth)/register/RegisterForm.test.tsx>) | `RegisterForm` | Botão de envio desabilitado até o formulário ficar válido; normalização do username ao digitar; alternância de visibilidade da senha (afeta senha e confirmação); checklist de condições de senha atualiza em tempo real; submissão chama a action com os dados corretos e redireciona em caso de sucesso; mensagem de erro exibida em caso de falha |
| [`src/app/(auth)/login/LoginForm.test.tsx`](<../src/app/(auth)/login/LoginForm.test.tsx>) | `LoginForm` (+ hook `useLogin`) | Botão de envio desabilitado até username e senha preenchidos; alternância de visibilidade da senha; chamada à API com o corpo correto e redirecionamento em caso de sucesso; mensagem de erro da API exibida em caso de falha; link para `/forgot-password` |
| [`src/app/dashboard/residences/join/EntrarResidenciaForm.test.tsx`](<../src/app/dashboard/residences/join/EntrarResidenciaForm.test.tsx>) | `EntrarResidenciaForm` | Normalização do código digitado (maiúsculas, filtro de caracteres inválidos, limite de 6); botão de envio só habilita com 6 caracteres; mensagens de sucesso e de erro devolvidas pela action |
| [`src/components/despesas/CadastrarDespesaModal.test.tsx`](../src/components/despesas/CadastrarDespesaModal.test.tsx) | `CadastrarDespesaModal` | Não renderiza nada fechado; exibe a competência aberta quando aberto; chama `onFechar` ao clicar em fechar; botão de envio exige nome, valor **e** categoria; preenche a descrição a partir de uma sugestão; em sucesso, limpa os campos e mostra a confirmação; em erro, mantém os campos preenchidos e mostra a mensagem |
| [`src/app/(auth)/forgot-password/EsqueciSenhaForm.test.tsx`](<../src/app/(auth)/forgot-password/EsqueciSenhaForm.test.tsx>) | `EsqueciSenhaForm` (+ hook `useEsqueciSenha`) | Botão de envio desabilitado com o campo vazio; email inválido não chama a API; mensagem de sucesso exibida é a **devolvida pelo mock** (prova que não está hardcoded — F-08); mensagem de erro em `429`; botão "Reenviar" nasce desabilitado logo após o envio |
| [`src/app/(auth)/change-password/RedefinirSenhaForm.test.tsx`](<../src/app/(auth)/change-password/RedefinirSenhaForm.test.tsx>) | `RedefinirSenhaForm` (+ hook `useRedefinirSenha`) | Sem `?token=`, vai direto para o estado inválido sem chamar a API (F-07); token recusado pelo `/verify` mostra o estado inválido sem formulário; token válido mostra o formulário com as condições de senha reagindo em tempo real; submissão bem-sucedida chama `/auth/reset-password` com o token e as duas senhas e **chama `logout()`** (prova do F-09); um `400` na submissão volta ao estado inválido; `router.replace` limpa o token da URL (prova do F-06) |
| [`src/app/dashboard/residences/[code]/ResumoDoMes.test.tsx`](<../src/app/dashboard/residences/[code]/ResumoDoMes.test.tsx>) | `ResumoDoMes` | Os 4 estados do selo da competência (C.1: sem selo aberta, `fechado` neutro sem settlement, `aguardando pagamento`/`aguardando confirmação` com contagem, `mês quitado`); a chamada "Ver acertos" no card de saldo só aparece com alguma linha `PENDING`, com o link apontando para a competência em exibição |
| [`src/app/dashboard/residences/[code]/expenses/ConsultaDespesas.test.tsx`](<../src/app/dashboard/residences/[code]/expenses/ConsultaDespesas.test.tsx>) | `ConsultaDespesas` | O link "Ver acertos" só aparece com o mês fechado, com o `href` da competência em exibição — inclusive em fechamento legado sem `settlement` (D-09) |
| [`src/app/dashboard/residences/[code]/settlements/AcertosDaCompetencia.test.tsx`](<../src/app/dashboard/residences/[code]/settlements/AcertosDaCompetencia.test.tsx>) | `AcertosDaCompetencia` | Separação "Seus acertos"/"Todos os acertos"; os dois indicadores independentes por linha, mesmo com só um carimbo preenchido (D-30/RN-076); linha dispensada mostra o motivo em vez dos indicadores; confirmar recebimento nunca bloqueado por falta de comprovante do devedor; dispensar é só do owner e some com a residência arquivada; anexar aparece só pro payer e continua disponível após o primeiro comprovante (D-11); aviso de indisponibilidade quando `canUpload` é `false` (D-18); miniaturas de comprovante visíveis a qualquer membro (RN-080), não só a quem está no par |
| [`src/app/dashboard/residences/[code]/settlements/DispensarAcertoModal.test.tsx`](<../src/app/dashboard/residences/[code]/settlements/DispensarAcertoModal.test.tsx>) | `DispensarAcertoModal` | Botão desabilitado com motivo vazio ou curto demais (RN-082 exige 3+ caracteres); contador de caracteres; cancelar fecha sem chamar a action; sucesso atualiza a tela e fecha o modal; erro da API mantém o modal aberto com a mensagem |
| [`src/app/dashboard/residences/[code]/settlements/AnexarComprovanteInput.test.tsx`](<../src/app/dashboard/residences/[code]/settlements/AnexarComprovanteInput.test.tsx>) | `AnexarComprovanteInput` | Chama `anexar()` com o arquivo escolhido e avisa o pai só em sucesso; texto de progresso conforme o estado do hook; erro sem `receiptId` não mostra "Tentar novamente"; erro com `receiptId` mostra o botão e chama `tentarNovamente()` |
| [`src/app/dashboard/residences/[code]/settlements/useAnexarComprovante.test.ts`](<../src/app/dashboard/residences/[code]/settlements/useAnexarComprovante.test.ts>) | `useAnexarComprovante` | Os 4 passos do upload na ordem certa (C.4); `file` como último campo do `FormData`; passo 3 usa `fetch` puro (não `apiFetchClient`), sem `credentials`; falha no passo 3 não chama o passo 4; falha no passo 4 preserva o `receiptId` — `tentarNovamente` refaz só o passo 4, nunca o 3 (armadilha nº4 do C.4); mensagens do C.7 para `503`/`422`, mensagem crua da API nos demais status (F-08) |
| [`src/app/dashboard/residences/[code]/settlements/Comprovante.test.tsx`](<../src/app/dashboard/residences/[code]/settlements/Comprovante.test.tsx>) | `Comprovante` | Busca a URL ao montar (nunca recebida pronta do servidor, D-25); `<img>` para tipos de imagem; link em nova aba para PDF, sem tentar embutir; mensagem amigável quando a busca falha; busca de novo quando o `receiptId` muda |

**Total:** 14 arquivos, 106 casos de teste.

---

## 🔧 Adaptações e decisões técnicas

Registro das decisões e dos problemas reais encontrados ao escrever esta suíte — para não serem redescobertos depois.

### `@jest/globals` → `@types/jest`

A primeira versão dos testes importava `describe`/`it`/`expect`/`jest` explicitamente de `@jest/globals`, para não depender de tipos globais ambíguos sem ter `@types/jest` instalado. Depois **instalamos `@types/jest`** e removemos esses imports de todos os arquivos, voltando a usar os globais do Jest (`describe`, `it`, `expect`...) sem import — mais próximo da maioria dos exemplos e templates da comunidade. Ambas as formas são suportadas oficialmente pelo Jest; a troca foi só de preferência.

### Espaço não-quebrável no `toLocaleString('pt-BR')`

O primeiro teste de `formatarValor` falhava com um diff que parecia idêntico (`"R$ 180,50"` vs `"R$ 180,50"`). A causa: `toLocaleString('pt-BR', { style: 'currency' })` usa **espaço não-quebrável** (`U+00A0`) entre o símbolo e o número, não o espaço comum (`U+0020`). Os valores esperados nos testes usam o caractere correto — confirmado inspecionando os *code points* diretamente, não visualmente.

### `jest.mock` automático vs. factory explícita

`CadastrarDespesaForm.test.tsx` mocka `cadastrarDespesaAction`. A primeira tentativa (`jest.mock("../cadastrarDespesaAction")`, sem factory) falhava com `ReferenceError: TextEncoder is not defined`: o **automock** do Jest ainda precisa carregar o módulo real para inspecionar seu formato, e essa action importa `getCurrentUser`, que puxa `next/cache` — código de servidor que usa `TextEncoder`, indisponível no ambiente `jsdom` dos testes. A correção foi trocar para uma **factory explícita** (`jest.mock("../cadastrarDespesaAction", () => jest.fn())`), que nunca chega a carregar o módulo real. As demais actions mockadas (`registerAction`, `entrarResidenciaAction`) não têm esse problema porque não importam nada do lado servidor do Next.

### `next/form` e `next/link` não exigem provider em teste

Antes de escrever os testes de formulário, foi verificado no código-fonte do Next.js (`node_modules/next/dist/client/app-dir/form.js` e `.../link.js`) que ambos os componentes acessam o contexto do roteador via `useContext`, que retorna `null` graciosamente sem provider — não via `useRouter()`, que lançaria erro fora de contexto. Por isso, **não é preciso** envolver os testes em nenhum provider de rota: só mockamos `next/navigation` (`useRouter`) nos componentes que o chamam diretamente (`RegisterForm`, `LoginForm`/`useLogin`, `CadastrarDespesaForm`) — `EntrarResidenciaForm`, que só usa `<Link>`, não precisou de mock nenhum.

### O que é mockado, e por quê

Em todo teste de componente, a fronteira mockada é sempre **rede ou navegação** — nunca o componente em si:

- **Server Actions** (`registerAction`, `entrarResidenciaAction`, `cadastrarDespesaAction`) são substituídas por `jest.fn()` com retorno controlado por teste (`mockResolvedValue`), para testar a reação da UI a sucesso/erro sem depender de uma API real.
- **`apiFetchClient`** é mockado em `LoginForm.test.tsx`, `EsqueciSenhaForm.test.tsx` e `RedefinirSenhaForm.test.tsx`, porque os hooks correspondentes (`useLogin`, `useEsqueciSenha`, `useRedefinirSenha`) chamam a API diretamente (não são Server Actions) — mesmo princípio, fronteira diferente. Em `RedefinirSenhaForm.test.tsx`, `useLogout` também é mockado, pra poder verificar que ele é chamado após o sucesso (F-09) sem depender do `useRouter`/`UserProvider` reais.
- **`useRouter`** (`next/navigation`) é mockado para capturar `push`/`refresh` sem navegação real.

### Convenção de local dos arquivos

Todo `*.test.ts`/`*.test.tsx` fica **colocado ao lado do arquivo que testa**, seguindo o padrão de colocation já usado no projeto para componentes de rota única (ver discussão sobre `RegisterForm.tsx` não precisar estar em `components/`). O Jest encontra esses arquivos automaticamente — não é preciso configurar `testMatch`.

### Nota sobre a reestruturação de rotas em andamento

Durante a escrita destes testes, o projeto tinha uma reestruturação de rotas **não commitada** em andamento (`(auth)/app/*` → `app/dashboard/*`, `(auth)/profile/*` → `app/profile/*`). Os testes de `EntrarResidenciaForm` e `CadastrarDespesaForm` foram escritos já nos caminhos novos (`src/app/dashboard/...`); nada dessa reestruturação foi criado ou alterado por este trabalho de testes.

---

## 📌 O que ainda não está coberto

Fora do escopo desta rodada, por decisão consciente:

- **Componentes que buscam dados** (`ConsultaDespesas`, `PainelResidencia`, `GerenciarMembros`, `RelatorioResidencia`, `ListaResidencias`, `SinoNotificacoes`...) — exigiriam mock pesado de contexto/API para um retorno de valor pequeno; se encaixam melhor nos **testes E2E** já planejados.
- **`resumoImagem.ts`** (`compartilharResumoDaResidencia`) e `csv.ts#baixarCsv` — dependem de `fetch`, `canvas` e manipulação de DOM (`URL.createObjectURL`, download de arquivo); também candidatos a E2E.
- **`CriarResidenciaForm`** e **`ChangePasswordForm`** — estruturalmente redundantes com `EntrarResidenciaForm` e `RegisterForm`, respectivamente, já cobertos. Podem ser replicados sob demanda.
- **Perfil, notificações, relatórios, gráficos** — ver marcações ⬜ no [backlog](#-backlog-de-funcionalidades).
- **Caminho feliz de ponta a ponta da recuperação de senha** (pedir o link, abrir o email, clicar e redefinir a senha) — decisão consciente (F-10 de `docs/plano-recuperacao-de-senha-frontend.md`), não esquecimento. O Cypress não lê email, e montar essa ponte (caixa de teste, IMAP, serviço de captura) custaria muito mais do que entrega aqui. O `cypress/e2e/recuperar-senha.cy.ts` cobre só o que dá pra testar sem isso: navegação a partir do login, mensagem genérica de confirmação (prova visível do D-03/anti-enumeração) e tela de link inválido. O caminho feliz completo é coberto pela suíte de **integração da API** (Fase 5 do plano da API), que tem o token em mãos porque injeta um `sendEmail` espião.
- **Upload de comprovante de ponta a ponta** (anexar → S3 → complete) — decisão consciente (F-17 de `docs/plano-registro-de-pagamentos-frontend.md`), não esquecimento. O passo 3 do upload fala **direto com o S3** (D-28), o que só funciona com o bucket real configurado e CORS liberado para a origem específica que o Cypress usa (`http://localhost:3100`) — não é razoável um agente validar isso sem saber se aquela origem está na lista de CORS do bucket. O `cypress/e2e/acertos-de-pagamento.cy.ts` cobre o que não depende do S3: fechar um mês com saldo ≠ zero, abrir a tela de acertos e confirmar recebimento como credor (RN-076, não toca o S3). O caminho feliz completo do upload é coberto pela suíte de **integração da API** (Fase 8 da Parte B do plano de arquitetura), que roda com um storage fake em memória.
- **Dimensões reais da compressão de imagem** (`comprimirImagem.ts`) — o `jsdom` não implementa `createImageBitmap` nem renderização de canvas de verdade (não há o pacote `canvas` instalado neste projeto), então `comprimirImagem.test.ts` cobre a orquestração com mocks das APIs do navegador (ordem das chamadas, tratamento de erro, nome/tipo do arquivo de saída), não o resultado visual real da compressão. A função pura de escala (`calcularDimensoes`) é testada sem navegador nenhum.
