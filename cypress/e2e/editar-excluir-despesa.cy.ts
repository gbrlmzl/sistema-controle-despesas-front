describe('deveria editar e excluir uma despesa', () => {
  it('deveria editar os dados de uma despesa e depois excluí-la', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Cypress ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/expenses`);

        // Primeira interação após um cy.visit: usa retentativa (ver
        // cypress/support/commands.ts) contra a rara corrida de hidratação.
        cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('80,00');
          cy.get("input[name='name']").type('Internet');
          cy.selecionarCategoria('Assinaturas');
          cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();
          cy.get("input[name='name']").should('have.value', '');
          cy.get('button[aria-label="Fechar"]').first().click();
        });

        // Grupos por membro nascem recolhidos.
        cy.get('button[title="Mostrar despesas"]').click();
        cy.contains('Internet').should('be.visible');

        // Edita: nome, valor e categoria.
        cy.contains('button', 'Editar').click();
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='name']").clear().type('Internet fibra');
          cy.get("input[name='value']").clear().type('99,90');
          cy.get('select[name="category"]').select('DOMESTICAS');
          cy.contains('button[type="submit"]', 'Salvar').should('be.enabled').click();
        });

        cy.contains('Internet fibra').should('be.visible');
        cy.contains('Contas domésticas').should('be.visible');

        // Exclui.
        cy.contains('button', 'Excluir').click();
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Excluir despesa').should('be.visible');
          cy.contains('button', 'Excluir').click();
        });

        cy.contains('Internet fibra').should('not.exist');
        cy.contains('Nenhuma despesa cadastrada nesta competência').should('be.visible');
      });
    });
  });
});
