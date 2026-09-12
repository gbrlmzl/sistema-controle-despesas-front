describe('deveria criar uma residência', () => {
  it('deveria criar uma residência', () => {
    // Sufixo curto para o nome da residência ser único a cada execução.
    const identificadorUnico = Date.now().toString().slice(-8);

    // Cadastra o próprio usuário em vez de logar com um fixo: o banco do e2e
    // sobe vazio (só migrations, sem seed), então depender de um usuário
    // pré-existente faria este spec falhar sempre no CI.
    cy.cadastrarUsuario();

    // Vai para a lista de residências
    cy.get("a[href='/dashboard/residences']").first().click();
    cy.location('pathname').should('eq', '/dashboard/residences');

    // Abre o formulário de criação pelo único ponto de entrada que sobrou: o
    // "Nova residência" do AppShell (a lista deixou de repetir os CTAs no
    // cabeçalho). O link é renderizado duas vezes — na barra do desktop e na tab
    // bar do mobile — e só uma delas fica visível por viewport, então filtra por
    // :visible antes de clicar: cy.click() recusa mais de um elemento.
    cy.get("a[href='/dashboard/residences/new']").filter(':visible').first().click();
    cy.location('pathname').should('eq', '/dashboard/residences/new');

    // Preenche e envia o formulário
    cy.get("input[name='name']").type(`Residencia Cypress ${identificadorUnico}`);
    cy.get("button[type='submit']").click();

    // Confirma o modal de sucesso
    cy.contains('Residência criada com sucesso!').should('be.visible');
    cy.get("button[title='Confirmar']").click();

    // É levado ao painel da residência recém-criada
    cy.location('pathname').should('match', /^\/dashboard\/residences\/.+/);
  })
})
