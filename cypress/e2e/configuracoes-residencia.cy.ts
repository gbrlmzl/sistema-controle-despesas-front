describe('deveria gerenciar as configurações da residência', () => {
  it('dono renomeia, gera novo código e arquiva/desarquiva', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then(() => {
      cy.criarResidencia(`Casa Config ${identificadorUnico}`).then((codigo) => {
        cy.visit(`/dashboard/residences/${codigo}/settings`);

        // Renomear — o modal fecha sozinho após o sucesso.
        cy.clicarComSeguranca(() => cy.contains('button', 'Renomear residência'), '[role="dialog"]');
        cy.get('[role="dialog"]').within(() => {
          cy.get("input[name='name']").clear().type(`Casa Renomeada ${identificadorUnico}`);
          cy.contains('button[type="submit"]', 'Salvar').should('be.enabled').click();
        });
        cy.contains(`Casa Renomeada ${identificadorUnico}`).should('be.visible');

        // Gerar novo código — o botão de confirmar repete o texto do gatilho.
        cy.contains('button', 'Gerar novo código').click();
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Gerar novo código').should('be.visible');
          cy.contains('button', 'Gerar novo código').click();
        });
        cy.location('pathname').should('match', /^\/dashboard\/residences\/[A-Z0-9]+\/settings$/);
        cy.location('pathname').should('not.include', `/${codigo}/settings`);

        // Arquivar / desarquivar.
        cy.contains('button', 'Arquivar residência').click();
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Arquivar residência').should('be.visible');
          cy.contains('button', 'Arquivar').click();
        });
        cy.contains('Arquivada · somente leitura').should('be.visible');

        cy.contains('button', 'Desarquivar residência').click();
        cy.get('[role="dialog"]').within(() => {
          cy.contains('h3', 'Desarquivar residência').should('be.visible');
          cy.contains('button', 'Desarquivar').click();
        });
        cy.contains('Arquivada · somente leitura').should('not.exist');
      });
    });
  });

  it('dono transfere a propriedade e o ex-dono sai da residência', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    cy.cadastrarUsuario().then((membro) => {
      cy.cadastrarUsuario().then((dono) => {
        cy.criarResidencia(`Casa Transferir ${identificadorUnico}`).then((codigo) => {
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='username']").type(membro.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
          });

          cy.login(membro.username, membro.password);
          cy.visit('/dashboard/residences');
          cy.clicarAteSumir(
            () => cy.contains('li', `Casa Transferir ${identificadorUnico}`).find('button:contains("Aceitar")'),
            'Convites recebidos'
          );

          cy.login(dono.username, dono.password);
          cy.visit(`/dashboard/residences/${codigo}/members`);
          cy.clicarComSeguranca(() => cy.get('button:contains("Tornar administrador")'), '[role="dialog"]');
          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Transferir propriedade').should('be.visible');
            cy.contains('button', 'Transferir').click();
          });

          // O ex-dono agora é membro comum: "Sair da residência" passa a existir.
          cy.visit(`/dashboard/residences/${codigo}/settings`);
          cy.clicarComSeguranca(() => cy.contains('button', 'Sair da residência'), '[role="dialog"]');
          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Sair da residência').should('be.visible');
            cy.contains('button', 'Sair').click();
          });

          cy.location('pathname').should('eq', '/dashboard/residences');
          cy.contains(`Casa Transferir ${identificadorUnico}`).should('not.exist');
        });
      });
    });
  });
});
