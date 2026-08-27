describe('deveria criar uma residência', () => {
  it('deveria fazer login e criar uma residência', () => {
    // Sufixo curto para o nome da residência ser único a cada execução.
    const identificadorUnico = Date.now().toString().slice(-8);

    // Cadastra o usuário na hora, em vez de depender de credenciais fixas no
    // banco: usuário hardcoded quebra o teste (401 no /auth/login) assim que a
    // base de desenvolvimento é recriada.
    cy.cadastrarUsuario().then((usuario) => {
      // Login pela UI. cy.login já cuida da corrida de hidratação do
      // LoginForm (ver cypress/support/commands.ts).
      cy.login(usuario.username, usuario.password);

      // Vai para a lista de residências
      cy.get("a[href='/dashboard/residences']").first().click();
      cy.location('pathname').should('eq', '/dashboard/residences');

      // Abre o formulário de criação. O href sozinho casa com 3 elementos (a
      // navegação do AppShell também oferece "Nova residência" fora de uma
      // residência), então ancora no botão da própria lista.
      cy.contains('a', 'Criar residência').click();
      cy.location('pathname').should('eq', '/dashboard/residences/new');

      // Preenche e envia o formulário
      cy.get("input[name='name']").type(`Residencia Cypress ${identificadorUnico}`);
      cy.get("button[type='submit']").click();

      // Confirma o modal de sucesso
      cy.contains('Residência criada com sucesso!').should('be.visible');
      cy.get("button[title='Confirmar']").click();

      // É levado ao painel da residência recém-criada
      cy.location('pathname').should('match', /^\/dashboard\/residences\/.+/);
    });
  })
})
