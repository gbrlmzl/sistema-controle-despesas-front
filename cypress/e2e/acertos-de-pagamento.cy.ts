// ⚠️ Este arquivo NÃO cobre o upload de comprovante de ponta a ponta (F-17,
// docs/plano-registro-de-pagamentos-frontend.md). O passo 3 do upload fala
// direto com o S3 (D-28), o que só funciona com o bucket real configurado e
// CORS liberado para a origem específica que este Cypress usa
// (http://localhost:3100) -- não é razoável validar isso sem saber se aquela
// origem está na lista de CORS do bucket.
//
// O que este arquivo cobre: fechar um mês com saldo != zero (o que cria os
// pares devedor->credor, D-01/D-29), abrir a tela de acertos, e confirmar
// recebimento como credor -- essa ação não toca o S3 (RN-076), então funciona
// sem nenhuma configuração de infraestrutura extra. O caminho completo do
// upload é coberto pela suíte de integração da API (Fase 8 da Parte B do
// plano de arquitetura), que roda com um storage fake em memória.

describe('acertos de pagamento', () => {
  it('mostra o par na tela de acertos e permite o credor confirmar o recebimento', () => {
    const identificadorUnico = Date.now().toString().slice(-6);

    // O convidado precisa existir antes do dono poder convidá-lo por
    // username (mesmo padrão de convite-membro.cy.ts).
    cy.cadastrarUsuario().then((convidado) => {
      cy.cadastrarUsuario().then((dono) => {
        cy.criarResidencia(`Casa Acertos ${identificadorUnico}`).then((codigo) => {
          cy.visit(`/dashboard/residences/${codigo}/members?convidar=1`);
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='username']").type(convidado.username);
            cy.contains('button[type="submit"]', 'Convidar').should('be.enabled').click();
            cy.contains('Convite enviado').should('be.visible');
          });

          cy.login(convidado.username, convidado.password);
          cy.visit('/dashboard/residences');
          cy.clicarAteSumir(
            () => cy.contains('li', `Casa Acertos ${identificadorUnico}`).find('button:contains("Aceitar")'),
            'Convites recebidos'
          );

          // Volta pro dono: ele lança a despesa sozinho, então ele é quem
          // PAGOU -- vira credor no rateio (recebe a cota do convidado).
          cy.login(dono.username, dono.password);
          cy.visit(`/dashboard/residences/${codigo}/expenses`);
          cy.clicarComSeguranca(() => cy.contains('button', 'Cadastrar despesa'), '[role="dialog"]');
          cy.get('[role="dialog"]').within(() => {
            cy.get("input[name='value']").type('100,00');
            cy.get("input[name='name']").type('Mercado');
            cy.selecionarCategoria('Alimentação');
            cy.contains('button[type="submit"]', 'Lançar despesa').should('be.enabled').click();
            cy.get("input[name='name']").should('have.value', '');
            cy.get('button[aria-label="Fechar"]').first().click();
          });

          // Fecha o mês -- é aqui que o rateio congela em linhas de acerto (D-21/D-29)
          cy.contains('button', 'Fechar mês').click();
          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Fechar o mês').should('be.visible');
            cy.contains('button', 'Fechar mês').click();
          });

          // Fechar o mês corrente abre a competência seguinte -- volta
          // explicitamente pra competência fechada (mesma técnica de
          // fechar-reabrir-mes.cy.ts) pra achar o link "Ver acertos".
          const agora = new Date();
          const mesFechado = agora.getMonth() + 1;
          const anoFechado = agora.getFullYear();
          cy.visit(`/dashboard/residences/${codigo}/expenses?mes=${mesFechado}&ano=${anoFechado}`);
          cy.contains('Mês fechado').should('be.visible');
          cy.contains('a', 'Ver acertos').click();

          cy.location('pathname').should('eq', `/dashboard/residences/${codigo}/settlements`);
          cy.contains(convidado.name).should('be.visible');
          cy.contains(dono.name).should('be.visible');

          // D-30 -> os dois indicadores começam pendentes, independentes um do outro
          cy.contains('Comprovante ainda não anexado').should('be.visible');
          cy.contains('Recebimento ainda não confirmado').should('be.visible');

          // RN-076 -> o dono (credor deste par) confirma sem nenhum
          // comprovante anexado -- não há ordem obrigatória entre os dois lados.
          cy.clicarComSeguranca(() => cy.contains('button', 'Confirmar recebimento'), '[role="dialog"]');
          cy.get('[role="dialog"]').within(() => {
            cy.contains('h3', 'Confirmar recebimento').should('be.visible');
            cy.contains(convidado.name).should('be.visible');
            cy.contains('button', 'Confirmar recebimento').click();
          });

          cy.contains('Recebimento confirmado').should('be.visible');
          cy.contains('Recebimento ainda não confirmado').should('not.exist');
        });
      });
    });
  });
});
