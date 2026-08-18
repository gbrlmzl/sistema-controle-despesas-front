// F-10: o Cypress não lê email, então este arquivo NÃO cobre o caminho feliz de
// ponta a ponta (pedir o link, abrir o email, clicar, redefinir). Montar essa ponte
// (caixa de teste, IMAP, serviço de captura) custaria muito mais do que entrega
// aqui. O que dá pra testar sem isso: a navegação a partir do login, a mensagem
// genérica de confirmação (prova visível do D-03/anti-enumeração) e a tela de link
// inválido. O caminho feliz é coberto pela suíte de integração da API, que tem o
// token em mãos porque injeta um sendEmail espião — ver
// docs/backlog-e-casos-de-teste.md, seção "O que ainda não está coberto".
describe('recuperação de senha', () => {
  it('leva de /login a /forgot-password pelo link "Esqueci minha senha"', () => {
    cy.visit('/login');
    cy.contains('a', 'Esqueci minha senha').click();
    cy.location('pathname').should('eq', '/forgot-password');
  });

  it('mostra a mensagem genérica de confirmação mesmo para um email inexistente', () => {
    const identificadorUnico = Date.now().toString().slice(-8);

    cy.visit('/forgot-password');
    cy.get("input[name='email']").type(`inexistente_${identificadorUnico}@example.com`);
    cy.get("button[type='submit']").click();

    // A tela troca o formulário pela confirmação: o campo de email visível some,
    // e não há nenhuma pista de que a conta não existe.
    cy.get("input[type='email']").should('not.exist');
    cy.contains('a', 'Voltar para o login').should('be.visible');
  });

  it('mostra a tela de link expirado para um token inválido, sem campos de senha', () => {
    cy.visit('/change-password?token=tokeninvalido');

    cy.contains('Este link expirou ou já foi usado').should('be.visible');
    cy.get("input[name='newPassword']").should('not.exist');

    cy.contains('a', 'Esqueci minha senha').click();
    cy.location('pathname').should('eq', '/forgot-password');
  });
});
