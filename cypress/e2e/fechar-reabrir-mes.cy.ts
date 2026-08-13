describe('deveria fechar e reabrir o mês', () => {
  it('deveria fechar o mês corrente e depois reabri-lo', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Cypress ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/expenses`);

        // Primeira interação depois de um cy.visit: usa retentativa (ver
        // cypress/support/commands.ts) contra a rara corrida de hidratação.
        cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='value']").type('50,00');
          cy.get("input[name='name']").type('Feira do mês');
          cy.selecionarCategoria('Alimentação');
          cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();
          cy.get("input[name='name']").should('have.value', '');
          cy.get('button[aria-label="Fechar"]').first().click();
        });

        // O botão de confirmar do modal repete o texto do gatilho ("Fechar
        // mês") — escopar no dialog evita casar com os dois.
        cy.contains('button', 'Fechar mês').click();
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Fechar o mês').should('be.visible');
          cy.contains('button', 'Fechar mês').click();
        });

        // Fechar o mês corrente abre a competência seguinte — a página passa a
        // exibi-la (sem o selo de fechado). "Reabrir mês" só aparece na
        // competência que está fechada, então volta pra ela explicitamente.
        cy.contains('button', 'Cadastrar despesa').should('be.visible');
        const agora = new Date();
        const mesFechado = agora.getMonth() + 1;
        const anoFechado = agora.getFullYear();
        cy.visit(`/dashboard/residences/${codigo}/expenses?mes=${mesFechado}&ano=${anoFechado}`);

        cy.contains('Mês fechado').should('be.visible');
        cy.clicarComSeguranca(() => cy.contains('button', 'Reabrir mês'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Reabrir o mês').should('be.visible');
          cy.contains('button', 'Reabrir').click();
        });

        cy.contains('Mês fechado').should('not.exist');
        cy.contains('button', 'Cadastrar despesa').should('be.visible');
      });
    });
  });
});
