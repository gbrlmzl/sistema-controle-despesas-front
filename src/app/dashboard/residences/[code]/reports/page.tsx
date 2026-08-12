import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getResidenceExpenses, getResidenceCompetencies } from "@/lib/expensesApi";
import { getResidenceReport } from "@/lib/reportsApi";

import RelatorioResidencia from "./RelatorioResidencia";

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ mes?: string; ano?: string; aba?: string }>;
};

export default async function Relatorios({ params, searchParams }: PageProps) {
    const { code } = await params;
    const { mes, ano, aba } = await searchParams;

    const [detalhe, competencias] = await Promise.all([getResidenceDetail(code), getResidenceCompetencies(code)]);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Sem mês/ano informados, assume a competência aberta.
    const { competencia: aberta } = await getResidenceExpenses(code);
    const competencia = {
        month: Number(mes) || aberta.month,
        year: Number(ano) || aberta.year,
    };

    //CA-1 da US-024 -> a tela abre na aba da residência.
    const abaAtiva = aba === 'pessoal' ? 'pessoal' : 'residencia';

    const { relatorio, comparativo, evolucao, rateio, totalDaCasaInCents, despesas } =
        await getResidenceReport(code, competencia, abaAtiva);

    return (
        <div className="superficie">
            <RelatorioResidencia
                residencia={residencia}
                competencia={competencia}
                competencias={competencias}
                abaAtiva={abaAtiva}
                relatorio={relatorio}
                comparativo={comparativo}
                evolucao={evolucao}
                rateio={rateio}
                totalDaCasaInCents={totalDaCasaInCents}
                despesas={despesas} />
        </div>
    )


}
