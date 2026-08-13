describe('deveria exibir os relatórios da residência', () => {
  it('mostra os totais na aba residência e na aba pessoal', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Relatorio ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/expenses`);
        cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('200,00');
          cy.get("input[name='name']").type('Supermercado');
          cy.selecionarCategoria('Alimentação');
          cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();
          cy.get("input[name='name']").should('have.value', '');
          cy.get('button[aria-label="Fechar"]').first().click();
        });

        cy.visit(`/dashboard/residences/${codigo}/reports`);

        // Aba "Residência" é a padrão.
        cy.contains('[role="tab"]', 'Residência').should('have.attr', 'aria-selected', 'true');
        cy.contains('Total da residência').should('be.visible');
        cy.contains('Por categoria').should('be.visible');
        cy.contains('Alimentação').should('be.visible');

        // Primeira interação de clique após o cy.visit: usa retentativa (ver
        // cypress/support/commands.ts) contra a rara corrida de hidratação.
        cy.clicarComSeguranca(
          () => cy.contains('[role="tab"]', 'Meus gastos'),
          '[role="tab"][aria-selected="true"]:contains("Meus gastos")'
        );
        cy.contains('[role="tab"]', 'Meus gastos').should('have.attr', 'aria-selected', 'true');
        cy.contains('Meus gastos').should('be.visible');
      });
    });
  });
});
