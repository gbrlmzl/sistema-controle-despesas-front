import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

import SolicitacoesConvites from "./SolicitacoesConvites";
import type { Residencia, SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

//useAcoesResidencia arrasta as Server Actions da residência, que importam
//next/cache -- indisponível no jsdom (mesma armadilha dos outros testes desta
//pasta). Aqui só interessa o HTML, então o hook inteiro vira stub.
jest.mock("../../useAcoesResidencia", () => () => ({
    processando: false,
    responderSolicitacao: jest.fn(),
    cancelarConvite: jest.fn(),
    snackbar: { open: false, message: "", type: "" },
    fecharSnackbar: jest.fn(),
}));

const RESIDENCIA: Residencia = {
    name: "Casa das Flores",
    code: "AB12CD",
    ownerName: "Gabriel Mizael",
    isOwner: true,
    isArchived: false,
    members: [],
};

//Criada "agora": é o caso do dia a dia desta tela (o dono abre as pendências
//logo depois de a solicitação chegar) e o único em que formatarMomento muda de
//texto em questão de segundos.
const AGORA = new Date("2026-08-27T21:00:00.000Z");
const CRIADA_AGORA = new Date("2026-08-27T20:59:58.000Z").toISOString();

const SOLICITACOES: SolicitacaoPendente[] = [
    { id: 1, requesterName: "Letícia Rocha", requesterUsername: "leticia", createdAt: CRIADA_AGORA },
];

const CONVITES: ConviteEnviado[] = [
    { id: 9, invitedUserName: "Rafael Lima", invitedUserUsername: "rafa", createdAt: CRIADA_AGORA },
];

//Regressão do E2E entrar-residencia-codigo.cy.ts, que falhava de forma
//intermitente com o erro #418 do React ("text content does not match
//server-rendered HTML"): formatarMomento é relativo ao instante da chamada, em
//granularidade de segundo, então o servidor renderizava "há 2 segundos" e a
//hidratação, um instante depois, calculava "há 3 segundos". Quando a virada do
//segundo caía entre as duas, o React derrubava a página inteira -- e o Cypress
//reprovava o teste pelo erro não capturado.
//
//O teste força justamente essa virada (1s entre renderizar e hidratar), que na
//prática acontece só às vezes.
describe("SolicitacoesConvites: hidratação", () => {
    beforeEach(() => {
        jest.useFakeTimers({ doNotFake: ["queueMicrotask"] });
        jest.setSystemTime(AGORA);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("não reclama de divergência quando o tempo relativo muda entre o servidor e o cliente", async () => {
        const html = renderToString(
            <SolicitacoesConvites residencia={RESIDENCIA} solicitacoes={SOLICITACOES} convites={CONVITES} />
        );

        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.appendChild(container);

        //O que o servidor mandou é mesmo o texto instável -- se um dia deixar de
        //ser, este teste vira um falso "passou".
        expect(container.textContent).toContain("há 2 segundos");

        //A hidratação acontece depois do servidor: aqui, do outro lado da virada
        //do segundo.
        jest.setSystemTime(new Date(AGORA.getTime() + 1_000));

        const erros: unknown[] = [];
        await act(async () => {
            hydrateRoot(
                container,
                <SolicitacoesConvites residencia={RESIDENCIA} solicitacoes={SOLICITACOES} convites={CONVITES} />,
                { onRecoverableError: (erro) => erros.push(erro) }
            );
        });

        expect(erros).toEqual([]);
    });
});
