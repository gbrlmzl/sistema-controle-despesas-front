import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

//CA-4 da US-016 -> a notificação exibe o momento em que ocorreu.
//Tempo relativo ("há 2 horas") comunica melhor que data absoluta em uma lista de avisos.
//A versão "strict" é usada de propósito: a padrão arredonda e escreve "há cerca de
//2 horas", e esse "cerca de" só ocupa espaço sem acrescentar informação.
//
//⚠️ O resultado depende do INSTANTE da chamada, com granularidade de segundo. Em
//tela renderizada no servidor isso quebra a hidratação: o servidor escreve "há 2
//segundos" e o cliente, um instante depois, calcula "há 3 segundos" — o React
//derruba a página com o erro #418 ("text content does not match server-rendered
//HTML") sempre que a virada do segundo cai entre as duas. Como depende da virada
//cair naquela janela de milissegundos, falha só às vezes: foi assim que o E2E
//entrar-residencia-codigo.cy.ts passou a reprovar de forma intermitente, na tela
//de convites e solicitações (registro criado segundos antes, logo no "há N
//segundos" instável).
//
//Por isso o elemento que contém o texto precisa de suppressHydrationWarning — o
//escape hatch que o próprio React documenta para timestamps. Ele vale só um nível,
//então vai no elemento que é PAI DIRETO do texto. Vale para toda tela cujo dado
//chega pronto do servidor, mesmo que hoje o E2E só alcance por navegação client-side
//(um F5 ou um link direto hidrata e reabre o risco). Não é preciso onde os dados
//chegam por fetch no cliente (a central de alertas e o sino, por exemplo): ali o
//valor nem existe no HTML do servidor. Ver
//SolicitacoesConvites.hidratacao.test.tsx, que fixa a regressão.
export function formatarMomento(data: Date | string | number | null | undefined): string {
    if (!data) {
        return "";
    }

    return formatDistanceToNowStrict(new Date(data), { addSuffix: true, locale: ptBR });
}
