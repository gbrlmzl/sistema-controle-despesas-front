describe('deveria entrar em uma residência por código', () => {
  it('usuário solicita entrada por código e o dono aceita', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then((dono) => {
      cy.criarResidencia(`Casa Código ${identificadorUnico}`).then((codigo) => {
        cy.cadastrarUsuario().then(() => {
          cy.visit('/dashboard/residences/join');
          cy.get("input[name='code']").type(codigo);
          cy.get("input[name='code']").should('have.value', codigo);
          cy.get("button[type='submit']").should('be.enabled').click();
          cy.contains('Solicitação enviada', { matchCase: false }).should('be.visible');

          cy.login(dono.username, dono.password);
          cy.visit(`/dashboard/residences/${codigo}`);

          cy.contains('Solicitações de entrada').should('be.visible');
          // Primeira interação após um cy.visit: usa retentativa (ver
          // cypress/support/commands.ts) contra a rara corrida de hidratação.
          cy.clicarAteSumir(
            () => cy.contains('li', 'Teste Cypress').find('button:contains("Aceitar")'),
            'Solicitações de entrada'
          );

          cy.contains('Solicitações de entrada').should('not.exist');

          // Ambos os usuários de teste têm o mesmo nome genérico ("Teste
          // Cypress") — o sinal de que a solicitação virou associação de
          // verdade é a lista de membros passar a ter 2 itens.
          cy.visit(`/dashboard/residences/${codigo}/members`);
          cy.contains('h3', 'Membros').parent().parent().find('li').should('have.length', 2);
        });
      });
    });
  });
});
