describe('deveria exibir notificações na central de alertas', () => {
  it('convite recebido gera uma notificação e pode ser marcada como lida', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then((membro) => {
      cy.cadastrarUsuario().then(() => {
        cy.criarResidencia(`Casa Alertas ${identificadorUnico}`).then((codigo) => {
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='username']").type(membro.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
          });

          cy.login(membro.username, membro.password);
          cy.visit('/dashboard/alerts');

          cy.contains('Você não tem notificações').should('not.exist');
          cy.contains('button', 'Marcar todas como lidas').should('be.visible');
          cy.contains(`Casa Alertas ${identificadorUnico}`, { matchCase: false }).should('exist');

          cy.clicarAteSumir(() => cy.contains('button', 'Marcar todas como lidas'), 'Marcar todas como lidas');
          cy.contains('button', 'Marcar todas como lidas').should('not.exist');
        });
      });
    });
  });
});
