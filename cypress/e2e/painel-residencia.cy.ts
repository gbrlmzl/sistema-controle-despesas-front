describe('deveria exibir o resumo do mês no painel da residência', () => {
  it('mostra estado vazio e depois reflete uma despesa lançada', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Painel ${identificadorUnico}`).then((codigo) => {
        // Painel logo após a criação: nada lançado ainda.
        cy.visit(`/dashboard/residences/${codigo}`);
        cy.contains('Ainda não há despesas para dividir nesta competência.').should('be.visible');
        cy.contains('Nenhuma despesa cadastrada nesta competência.').should('be.visible');

        cy.visit(`/dashboard/residences/${codigo}/expenses`);
        cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('120,00');
          cy.get("input[name='name']").type('Água e luz');
          cy.selecionarCategoria('Contas domésticas');
          cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();
          cy.get("input[name='name']").should('have.value', '');
          cy.get('button[aria-label="Fechar"]').first().click();
        });

        cy.visit(`/dashboard/residences/${codigo}`);
        cy.contains('Você pagou').should('be.visible');
        cy.contains('R$ 120,00').should('be.visible');
        cy.contains('Água e luz').should('be.visible');
      });
    });
  });
});
