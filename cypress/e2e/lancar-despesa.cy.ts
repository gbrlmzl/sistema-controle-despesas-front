describe('deveria lançar uma despesa', () => {
  it('deveria criar uma residência e lançar uma despesa nela', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    // O cadastro (via UI) já estabelece sessão — a API loga o usuário no próprio
    // /auth/register, então não é preciso passar por /login separadamente.
    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Cypress ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/expenses`);

        cy.contains('Nenhuma despesa cadastrada nesta competência').should('be.visible');

        // Primeira interação após um cy.visit: usa retentativa (ver
        // cypress/support/commands.ts) contra a rara corrida de hidratação.
        cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');

        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('150,00');
          cy.get("input[name='name']").type('Mercado do mês');
          cy.selecionarCategoria('Alimentação');

          cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();

          // Sucesso limpa o formulário (lançamento incremental) — esperar por
          // isso garante que a Server Action já terminou antes de fechar o modal.
          cy.get("input[name='name']").should('have.value', '');

          // O Snackbar de sucesso é renderizado dentro do mesmo dialog (não fora
          // dele) e também tem um botão aria-label="Fechar" — o X do cabeçalho do
          // modal é o primeiro na ordem do DOM.
          cy.get('button[aria-label="Fechar"]').first().click();
        });

        cy.contains('Nenhuma despesa cadastrada nesta competência').should('not.exist');

        // Grupos por membro nascem recolhidos — expande para ver a despesa lançada.
        cy.get('button[title="Mostrar despesas"]').click();
        cy.contains('Mercado do mês').should('be.visible');
      });
    });
  });
});
