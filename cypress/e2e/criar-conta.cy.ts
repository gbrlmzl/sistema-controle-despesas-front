describe('deveria criar uma conta', () => {
  it('deveria criar uma conta', () => {
    // Sufixo curto (últimos 8 dígitos do timestamp) para caber no limite de 20
    // caracteres do username e ainda assim ser único a cada execução.
    const identificadorUnico = Date.now().toString().slice(-8);

    cy.visit('');
    cy.get("a[href='/cadastro']").first().click();
  
    cy.get("input[name='name']").type('Teste Cypress');
    cy.get("input[name='username']").type(`cy_${identificadorUnico}`);
    cy.get("input[name='email']").type(`teste_cypress_${identificadorUnico}@example.com`);
    cy.get("input[name='password']").type('Senha123!');
    cy.get("input[name='confirmPassword']").type('Senha123!');
    cy.get("button[type='submit']").click();

    cy.location('pathname').should('eq', '/')
  })
})