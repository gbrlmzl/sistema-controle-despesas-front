import type { Competencia } from "@/types/competencia";
import type { CompetenciaComDespesas } from "@/types/residencia";

//Formato AAAA-MM usado no :period das rotas de acerto e de fechamento de mês
//(ver reabrirMesAction.ts, que já usa a mesma expressão inline). Extraído aqui
//porque a Parte C do plano de acertos precisa dele em vários arquivos novos
//(leitura da lista, as três Server Actions, o hook de upload).
export function periodoAAAAMM(competencia: Competencia): string {
    return `${competencia.year}-${String(competencia.month).padStart(2, '0')}`;
}

//A tela de acertos passou a ser alcançável pela navegação do AppShell, sem o
//?mes&ano que os links "Ver acertos" carregam. A competência ABERTA não serve de
//padrão: por definição ela não tem fechamento (RN-069) e a leitura dos acertos
//devolveria 404 em toda entrada pela navbar. O padrão certo é a última FECHADA.
//A ordem da lista da API não é garantida por contrato, então o mais recente é
//calculado aqui em vez de confiar no primeiro/último item.
export function ultimaCompetenciaFechada(competencias: CompetenciaComDespesas[]): Competencia | null {
    const fechadas = competencias.filter(item => item.isClosed);
    if (fechadas.length === 0) {
        return null;
    }

    //Meses desde o ano 0: compara competências sem tratar a virada de ano à parte
    const emMeses = (item: Competencia) => item.year * 12 + item.month;
    const maisRecente = fechadas.reduce((atual, item) => (emMeses(item) > emMeses(atual) ? item : atual));

    return { month: maisRecente.month, year: maisRecente.year };
}
