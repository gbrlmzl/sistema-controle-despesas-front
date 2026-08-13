/// <reference types="cypress" />

export interface UsuarioTeste {
  username: string;
  password: string;
  name: string;
}

// Garante unicidade mesmo quando dois usuários são cadastrados no mesmo teste,
// em milissegundos próximos (Date.now() sozinho não é suficiente nesse caso).
let contadorUsuario = 0;

// Cadastra um usuário novo com dados únicos (via UI, /cadastro) e devolve as
// credenciais. O /auth/register já estabelece sessão (mesma resposta do
// login), então quem só precisa de "um usuário logado" não precisa chamar
// cy.login em seguida — as credenciais retornadas servem para logins
// posteriores (ex: um segundo usuário aceitando um convite depois de um
// cy.login explícito).
Cypress.Commands.add('cadastrarUsuario', () => {
  contadorUsuario += 1;
  const identificadorUnico = `${Date.now().toString().slice(-6)}${contadorUsuario}`;
  const username = `cy_${identificadorUnico}`;
  const password = 'Senha123!';
  const name = 'Teste Cypress';

  // Quem já está logado é redirecionado para fora de /cadastro (ver
  // src/proxy.ts) — limpa a sessão antes, para funcionar mesmo chamado depois
  // de outro cy.cadastrarUsuario()/cy.login() no mesmo teste (ex: fluxos com
  // dois usuários).
  cy.clearCookies();
  cy.visit('/cadastro');
  cy.get("input[name='name']").type(name);
  cy.get("input[name='username']").type(username);
  cy.get("input[name='email']").type(`${username}@example.com`);
  cy.get("input[name='password']").type(password);
  cy.get("input[name='confirmPassword']").type(password);
  cy.get("button[type='submit']").click();

  cy.location('pathname').should('eq', '/');

  return cy.wrap<UsuarioTeste>({ username, password, name }, { log: false });
});

// Faz login pela UI. Os campos de usuário/senha são inputs controlados pelo
// React (LoginForm.tsx): se o Cypress digitar antes da hidratação terminar, o
// primeiro re-render (disparado ao digitar a senha) reconcilia o campo de
// usuário de volta ao estado vazio, apagando o texto. Por isso confere o valor
// depois de digitar os dois campos e redigita se necessário — nesse ponto a
// hidratação já terminou, então o valor gruda.
Cypress.Commands.add('login', (username: string, password: string) => {
  // Mesma razão do cy.clearCookies() em cadastrarUsuario: quem já está logado
  // é redirecionado para fora de /login (ver src/proxy.ts).
  cy.clearCookies();
  cy.visit('/login');

  cy.get("input[name='username']").type(username);
  cy.get("input[name='password']").type(password);

  cy.get("input[name='username']").then(($input) => {
    if ($input.val() !== username) {
      cy.wrap($input).clear().type(username);
    }
  });

  cy.get("input[name='username']").should('have.value', username);
  cy.get("input[name='password']").should('have.value', password);
  cy.get("button[type='submit']").should('be.enabled').click();

  cy.location('pathname').should('eq', '/');
});

// Cria uma residência a partir de /dashboard/residences/new, confirma o modal
// de sucesso e devolve o código gerado (para navegar direto pra ela depois).
Cypress.Commands.add('criarResidencia', (nome: string) => {
  cy.visit('/dashboard/residences/new');
  cy.get("input[name='name']").type(nome);
  cy.get("button[type='submit']").click();

  cy.contains('Residência criada com sucesso!').should('be.visible');

  return cy.get('[aria-labelledby="tituloResidenciaCriada"] p').eq(1).invoke('text').then((codigo) => {
    cy.get("button[title='Confirmar']").click();
    cy.location('pathname').should('eq', `/dashboard/residences/${codigo}`);
    return cy.wrap(codigo, { log: false });
  });
});

// Clica um elemento e confirma que produziu o efeito esperado (existência de
// outro elemento na página). Botões type="button" sem estado "disabled" não
// dão erro quando clicados antes da hidratação terminar — simplesmente não
// fazem nada, porque o onClick ainda não foi anexado pelo React. Isso só
// acontece logo depois de um cy.visit (navegação completa, hidrata do zero);
// cliques numa página já hidratada (navegação client-side, via Link) não têm
// esse risco. Use isso na primeira interação de botão após um cy.visit.
Cypress.Commands.add('clicarComSeguranca', (obterElemento: () => Cypress.Chainable<JQuery<HTMLElement>>, seletorEfeito: string) => {
  obterElemento().click();
  cy.get('body').then(($body) => {
    if ($body.find(seletorEfeito).length === 0) {
      obterElemento().click();
    }
  });
});

// Seleciona uma categoria no SeletorCategoria (usado no cadastro/edição de
// despesas recorrentes e no CadastrarDespesaModal). No viewport padrão do
// Cypress (1000x660, >= 900px) só a versão dropdown fica visível — a grade
// com ícones do mobile existe no DOM mas fica com display:none. Por isso é
// preciso abrir o painel antes de clicar na opção; a grade mobile não precisa
// disso, mas não é exercitada por este helper. Chame dentro de um
// cy.get('[role="dialog"]').within(...) para escopar o clique no gatilho pro
// formulário certo — mas o painel de opções mora num portal em document.body
// (fora da árvore do dialog), então buscamos a opção via cy.document()/body
// pra escapar do escopo do .within() ambiente, que senão nunca encontraria
// [role="option"] (ele só busca descendentes do elemento envolvido).
Cypress.Commands.add('selecionarCategoria', (rotulo: string) => {
  cy.get('[aria-haspopup="listbox"]').click();
  cy.document().then((documento) => {
    cy.wrap(documento.body).find('[role="option"]').contains(rotulo).click();
  });
});

// Mesma proteção de clicarComSeguranca, mas para ações cujo efeito esperado é
// um texto SUMIR da página (ex: aceitar uma solicitação, cancelar um convite)
// em vez de um elemento aparecer. Diferente de clicarComSeguranca, essas ações
// costumam envolver uma Server Action (rede) antes do texto sumir de verdade —
// por isso espera um instante antes de checar, para não confundir "ainda
// processando" com "o clique não fez nada" e disparar um clique duplicado
// bem na hora em que o elemento está sendo removido do DOM.
Cypress.Commands.add('clicarAteSumir', (obterElemento: () => Cypress.Chainable<JQuery<HTMLElement>>, textoQueDeveSumir: string) => {
  obterElemento().click();
  cy.wait(600);
  cy.get('body').then(($body) => {
    if ($body.text().includes(textoQueDeveSumir)) {
      obterElemento().click();
    }
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      cadastrarUsuario(): Chainable<UsuarioTeste>;
      login(username: string, password: string): Chainable<void>;
      criarResidencia(nome: string): Chainable<string>;
      clicarComSeguranca(obterElemento: () => Chainable<JQuery<HTMLElement>>, seletorEfeito: string): Chainable<void>;
      clicarAteSumir(obterElemento: () => Chainable<JQuery<HTMLElement>>, textoQueDeveSumir: string): Chainable<void>;
      selecionarCategoria(rotulo: string): Chainable<void>;
    }
  }
}
