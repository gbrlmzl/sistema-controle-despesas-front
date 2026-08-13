describe('deveria convidar um usuário e ele aceitar o convite', () => {
  it('dono convida por username, convidado aceita e passa a ver a residência', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    // Cria o convidado primeiro — precisa existir antes do dono poder
    // convidá-lo por username. cadastrarUsuario já loga a conta criada.
    cy.cadastrarUsuario().then((convidado) => {
      cy.cadastrarUsuario().then((dono) => {
        cy.criarResidencia(`Casa Convite ${identificadorUnico}`).then((codigo) => {
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);

          // O modal abre sozinho via query param (prop vinda do servidor) — não
          // depende de um clique após o cy.visit, então não há corrida de hidratação aqui.
          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Convidar usuário').should('be.visible');
            cy.get("input[name='username']").type(convidado.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
          });

          cy.login(convidado.username, convidado.password);
          cy.visit('/dashboard/residences');

          cy.contains('Convites recebidos').should('be.visible');
          cy.contains(`Casa Convite ${identificadorUnico}`).should('be.visible');
          cy.contains(`Convite de ${dono.name}`).should('be.visible');

          // Primeira interação após um cy.visit: usa retentativa (ver
          // cypress/support/commands.ts) contra a rara corrida de hidratação.
          cy.clicarAteSumir(
            () => cy.contains('li', `Casa Convite ${identificadorUnico}`).find('button:contains("Aceitar")'),
            'Convites recebidos'
          );

          cy.contains(`Casa Convite ${identificadorUnico}`).should('be.visible');
          cy.contains('Convites recebidos').should('not.exist');
        });
      });
    });
  });
});
