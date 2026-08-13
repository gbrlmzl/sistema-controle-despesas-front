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
| [`src/schemas/usuarios.test.ts`](../src/schemas/usuarios.test.ts) | `usernameSchema`, `registerSchema` (Zod) | Regras do username (tamanho, `a-z0-9_`); cadastro completo, incluindo e-mail inválido, senha fraca (sem dígito/símbolo) e confirmação de senha divergente (com verificação do `path` do erro) |
| [`src/schemas/residencias.test.ts`](../src/schemas/residencias.test.ts) | `residenceNameSchema`, `criarResidenciaSchema`, `residenceCodeSchema`, `entrarResidenciaSchema` (Zod) | Regras do nome da residência (tamanho, caracteres permitidos, trim) e do código (exatamente 6 caracteres `A-Z0-9`) |

**Total:** 10 arquivos, 69 casos de teste.

---

## 🧩 Testes de componentes

Testam **comportamento visível ao usuário**: o que aparece na tela e como o componente reage a digitação/clique/seleção. Usam `render` + `screen` (Testing Library) e `userEvent.setup()` para simular interação real.

| Arquivo | Componente | O que é verificado |
|---|---|---|
| [`src/components/ui/Snackbar.test.tsx`](../src/components/ui/Snackbar.test.tsx) | `Snackbar` | Não renderiza nada fechado; exibe a mensagem aberto; chama `onClose` ao clicar em fechar; permanece montado durante o fade-out e desmonta 300ms depois (fake timers); cor de fundo muda conforme o `type` |
| [`src/app/(auth)/cadastro/RegisterForm.test.tsx`](<../src/app/(auth)/cadastro/RegisterForm.test.tsx>) | `RegisterForm` | Botão de envio desabilitado até o formulário ficar válido; normalização do username ao digitar; alternância de visibilidade da senha (afeta senha e confirmação); checklist de condições de senha atualiza em tempo real; submissão chama a action com os dados corretos e redireciona em caso de sucesso; mensagem de erro exibida em caso de falha |
| [`src/app/(auth)/login/LoginForm.test.tsx`](<../src/app/(auth)/login/LoginForm.test.tsx>) | `LoginForm` (+ hook `useLogin`) | Botão de envio desabilitado até username e senha preenchidos; alternância de visibilidade da senha; chamada à API com o corpo correto e redirecionamento em caso de sucesso; mensagem de erro da API exibida em caso de falha |
| [`src/app/dashboard/residences/join/EntrarResidenciaForm.test.tsx`](<../src/app/dashboard/residences/join/EntrarResidenciaForm.test.tsx>) | `EntrarResidenciaForm` | Normalização do código digitado (maiúsculas, filtro de caracteres inválidos, limite de 6); botão de envio só habilita com 6 caracteres; mensagens de sucesso e de erro devolvidas pela action |
| [`src/components/despesas/CadastrarDespesaModal.test.tsx`](../src/components/despesas/CadastrarDespesaModal.test.tsx) | `CadastrarDespesaModal` | Não renderiza nada fechado; exibe a competência aberta quando aberto; chama `onFechar` ao clicar em fechar; botão de envio exige nome, valor **e** categoria; preenche a descrição a partir de uma sugestão; em sucesso, limpa os campos e mostra a confirmação; em erro, mantém os campos preenchidos e mostra a mensagem |

**Total:** 5 arquivos, 28 casos de teste.

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
- **`apiFetchClient`** é mockado em `LoginForm.test.tsx`, porque `useLogin` chama a API diretamente (não é uma Server Action) — mesmo princípio, fronteira diferente.
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
