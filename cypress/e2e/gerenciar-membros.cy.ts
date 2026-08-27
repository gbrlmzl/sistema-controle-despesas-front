describe('deveria gerenciar membros da residência', () => {
  it('cancela um convite pendente e depois remove um membro já aceito', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then((convidado) => {
      cy.cadastrarUsuario().then((dono) => {
        cy.criarResidencia(`Casa Membros ${identificadorUnico}`).then((codigo) => {
          // Convida e cancela o convite antes de qualquer resposta.
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='username']").type(convidado.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
            cy.contains('button', 'Fechar').click();
          });

          // Convites enviados moram numa tela própria do owner, não mais no
          // painel da residência (ver members/requests/SolicitacoesConvites.tsx).
          cy.visit(`/dashboard/residences/${codigo}/members/requests`);

          // O título da seção fica na página mesmo sem convites pendentes
          // ("Nenhum convite enviado pendente."), então é o contador que
          // diferencia ter um convite de não ter nenhum.
          cy.contains('h3', 'Convites enviados (1)').should('be.visible');
          cy.clicarAteSumir(() => cy.contains('button', 'Cancelar'), 'Convites enviados (1)');
          cy.contains('Nenhum convite enviado pendente.').should('be.visible');

          // Convida de novo, e dessa vez o convidado aceita.
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='username']").type(convidado.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
          });

          cy.login(convidado.username, convidado.password);
          cy.visit('/dashboard/residences');
          cy.clicarAteSumir(
            () => cy.contains('li', `Casa Membros ${identificadorUnico}`).find('button:contains("Aceitar")'),
            'Convites recebidos'
          );

          // Volta como dono e remove o membro recém-aceito.
          cy.login(dono.username, dono.password);
          cy.visit(`/dashboard/residences/${codigo}/members`);
          cy.contains('h3', 'Membros').parent().parent().find('li').should('have.length', 2);

          // "Remover" só aparece na linha do outro membro (nunca sobre si mesmo).
          cy.clicarComSeguranca(() => cy.get('button:contains("Remover")'), '[role="dialog"]');

          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Remover membro').should('be.visible');
            cy.contains('button', 'Remover').click();
          });

          cy.contains('h3', 'Membros').parent().parent().find('li').should('have.length', 1);
        });
      });
    });
  });
});
