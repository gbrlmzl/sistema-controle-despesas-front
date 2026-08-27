import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getClosureSettlements } from "@/lib/acertosApi";
import { getResidenceCompetencies, getResidenceExpenses } from "@/lib/expensesApi";
import { getCurrentUser } from "@/lib/session";
import { ultimaCompetenciaFechada } from "@/utils/competencia";

import AcertosDaCompetencia from "./AcertosDaCompetencia";
import SemAcertos from "./SemAcertos";

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ mes?: string; ano?: string }>;
};

export default async function Acertos({ params, searchParams }: PageProps) {
    const { code } = await params;
    const { mes, ano } = await searchParams;

    const [detalhe, usuario, competencias] = await Promise.all([
        getResidenceDetail(code), getCurrentUser(), getResidenceCompetencies(code),
    ]);
    if (!detalhe || !usuario) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Sem mes/ano na URL -- entrada pela navegação do AppShell, não pelos links
    //"Ver acertos" nem pelo seletor -- o padrão é a última competência FECHADA. A
    //aberta não serve: competência aberta não tem fechamento (RN-069), então a
    //leitura abaixo devolveria null e a tela cairia em notFound() em toda entrada
    //pela navbar.
    const month = Number(mes);
    const year = Number(ano);
    const competencia = month && year
        ? { month, year }
        : ultimaCompetenciaFechada(competencias);

    //Duas situações caem aqui, e nenhuma delas é "residência não encontrada": a
    //residência ainda não fechou mês nenhum (competencia === null) ou o mês pedido
    //na URL existe mas não tem fechamento (resumo === null).
    const resumo = competencia ? await getClosureSettlements(code, competencia) : null;
    if (!resumo) {
        //O seletor (igual ao de Despesas/Relatórios) precisa de uma competência de
        //referência pra desenhar os atalhos de mês -- na primeira vez que a
        //residência entra aqui, ainda sem nenhum fechamento, usa a aberta.
        const { competencia: aberta } = await getResidenceExpenses(code);
        return (
            <div className="superficie">
                <SemAcertos residencia={residencia} competencia={competencia}
                    competenciaSelecionada={competencia ?? aberta} competencias={competencias} />
            </div>
        )
    }

    return (
        <div className="superficie">
            <AcertosDaCompetencia residencia={residencia} resumo={resumo} competencias={competencias} />
        </div>
    )
}
