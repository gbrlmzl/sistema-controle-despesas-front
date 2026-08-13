describe('deveria criar uma residência', () => {
  it('deveria fazer login e criar uma residência', () => {
    // Sufixo curto para o nome da residência ser único a cada execução.
    const identificadorUnico = Date.now().toString().slice(-8);

    // Login
    cy.visit('/login');

    cy.get("input[name='username']").type('cy_84438271');
    cy.get("input[name='password']").type('Senha123!');

    // Os campos são inputs controlados pelo React (LoginForm.tsx). Se a hidratação
    // ainda não tiver terminado quando o usuário foi digitado, o primeiro
    // re-render disparado pelo campo de senha reconcilia o campo de usuário de
    // volta ao estado real (vazio), apagando o texto. Quando isso acontece a
    // hidratação já terminou, então basta preencher de novo.
    cy.get("input[name='username']").then(($input) => {
      if ($input.val() !== 'cy_84438271') {
        cy.wrap($input).clear().type('cy_84438271');
      }
    });

    cy.get("input[name='username']").should('have.value', 'cy_84438271');
    cy.get("input[name='password']").should('have.value', 'Senha123!');
    cy.get("button[type='submit']").should('be.enabled').click();

    cy.location('pathname').should('eq', '/');

    // Vai para a lista de residências
    cy.get("a[href='/dashboard/residences']").first().click();
    cy.location('pathname').should('eq', '/dashboard/residences');

    // Abre o formulário de criação
    cy.get("a[href='/dashboard/residences/new']").click();
    cy.location('pathname').should('eq', '/dashboard/residences/new');

    // Preenche e envia o formulário
    cy.get("input[name='name']").type(`Residencia Cypress ${identificadorUnico}`);
    cy.get("button[type='submit']").click();

    // Confirma o modal de sucesso
    cy.contains('Residência criada com sucesso!').should('be.visible');
    cy.get("button[title='Confirmar']").click();

    // É levado ao painel da residência recém-criada
    cy.location('pathname').should('match', /^\/dashboard\/residences\/.+/);
  })
})
