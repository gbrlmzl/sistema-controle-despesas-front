import { notFound, redirect } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getResidenceRecurringExpenses } from "@/lib/expensesApi";
import type { ParamsResidencia } from "@/types/routes";

import DespesasRecorrentes from "./DespesasRecorrentes";


export default async function DespesasRecorrentesPage({ params }: ParamsResidencia) {
    const { code } = await params;

    //RN-018 / RN-010 -> quem não é membro recebe o mesmo resultado de código inexistente
    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Residência arquivada é somente leitura: não há o que gerenciar aqui
    if (residencia.isArchived) {
        redirect(`/dashboard/residences/${residencia.code}/expenses`);
    }

    const { competencia, despesasRecorrentes } = await getResidenceRecurringExpenses(code);

    return (
        <div className="superficie">
            <DespesasRecorrentes
                residencia={residencia}
                competencia={competencia}
                despesasRecorrentes={despesasRecorrentes} />
        </div>
    )


}
