import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getResidenceExpenses } from "@/lib/expensesApi";
import { getCurrentUser } from "@/lib/session";

import ConsultaDespesas from "./ConsultaDespesas";

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ mes?: string; ano?: string }>;
};

export default async function Despesas({ params, searchParams }: PageProps) {
    const { code } = await params;
    const { mes, ano } = await searchParams;

    const [detalhe, usuario] = await Promise.all([getResidenceDetail(code), getCurrentUser()]);
    if (!detalhe || !usuario) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    const { competencia: aberta } = await getResidenceExpenses(code);

    //Q-2 -> a competência aberta vem pré-selecionada
    const month = Number(mes) || aberta.month;
    const year = Number(ano) || aberta.year;

    const { resumo } = await getResidenceExpenses(code, { month, year });

    //Só o fechamento mais recente pode ser desfeito — a API valida isso no clique
    //(botão fica disponível sempre que o mês em exibição está fechado).
    const podeReabrir = resumo.isClosed;

    return (
        <div className="primaryCard">
            <ConsultaDespesas
                residencia={residencia}
                usuarioId={usuario.id}
                competencias={[]}
                competencia={{ month: month, year: year }}
                resumo={resumo}
                isCompetenciaAberta={month === aberta.month && year === aberta.year}
                podeReabrir={podeReabrir} />
        </div>
    )


}
