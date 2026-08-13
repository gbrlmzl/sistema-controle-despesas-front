describe('deveria gerenciar uma despesa recorrente', () => {
  it('deveria cadastrar uma despesa recorrente e depois parar a recorrência', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Cypress ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/expenses/recurring`);

        cy.contains('Nenhuma despesa recorrente cadastrada.').should('be.visible');

        // Primeira interação após um cy.visit: usa retentativa (ver
        // cypress/support/commands.ts) contra a rara corrida de hidratação.
        cy.clicarComSeguranca(() => cy.contains('button', 'Nova despesa recorrente'), '[role="dialog"]');

        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('45,00');
          cy.get("input[name='name']").type('Streaming de música');
          cy.selecionarCategoria('Assinaturas');
          cy.contains('button[type="submit"]', 'Adicionar despesa recorrente').should('be.enabled').click();
        });

        // O modal fecha sozinho após o sucesso (lançamento não é incremental aqui).
        cy.get('[role="dialog"]').should('not.exist');
        cy.contains('Streaming de música').should('be.visible');
        cy.contains('Nenhuma despesa recorrente cadastrada.').should('not.exist');

        // Para de repetir (não exclui o lançamento do mês corrente).
        cy.contains('li', 'Streaming de música').within(() => {
          cy.contains('button', 'Excluir').click();
        });

        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Parar de repetir').should('be.visible');
          cy.contains('button', 'Parar de repetir').click();
        });

        cy.contains('Streaming de música').should('not.exist');
        cy.contains('Nenhuma despesa recorrente cadastrada.').should('be.visible');
      });
    });
  });
});
