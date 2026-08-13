describe('deveria editar o perfil, trocar a senha e sair', () => {
  it('edita nome e avatar, troca a senha e faz logout', () => {
    const identificadorUnico = Date.now().toString().slice(-6);
    const novaSenha = 'NovaSenha123!';

    cy.cadastrarUsuario().then((usuario) => {
      cy.visit('/profile');

      // Editar nome. Primeira interação após o cy.visit: usa retentativa (ver
      // cypress/support/commands.ts) contra a rara corrida de hidratação.
      cy.clicarComSeguranca(() => cy.get('img[alt="Editar nome"]'), 'img[alt="Confirmar"]');
      cy.focused().clear().type(`Cypress Editado ${identificadorUnico}`);
      cy.get('img[alt="Confirmar"]').click();
      cy.contains('strong', 'Nome:').parent().should('contain.text', `Cypress Editado ${identificadorUnico}`);

      // Editar avatar.
      cy.get('img[alt="Editar foto"]').click();
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Escolha uma foto de perfil').should('be.visible');
        cy.get('button[aria-pressed]').first().click();
        cy.get('img[alt="Confirmar"]').click();
      });
      cy.get('[role="dialog"]').should('not.exist');

      // Trocar senha.
      cy.contains('a', 'Alterar senha').click();
      cy.get("input[name='currentPassword']").type(usuario.password);
      cy.get("input[name='newPassword']").type(novaSenha);
      cy.get("input[name='confirmNewPassword']").type(novaSenha);
      cy.get("button[type='submit']").should('be.enabled').click();
      cy.contains('Senha alterada com sucesso!').should('be.visible');

      // Logout.
      cy.visit('/profile');
      cy.contains('button', 'Sair').click();
      cy.location('pathname').should('eq', '/login');

      // A troca de senha realmente colou: só entra com a senha nova.
      cy.login(usuario.username, novaSenha);
    });
  });
});
