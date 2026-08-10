import { notFound, redirect } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getResidenceExpenses } from "@/lib/expensesApi";
import type { ParamsResidencia } from "@/types/routes";

import CadastrarDespesaForm from "./CadastrarDespesaForm";


export default async function CadastrarDespesa({ params }: ParamsResidencia) {
    const { code } = await params;

    //RN-018 / RN-010 -> quem não é membro recebe o mesmo resultado de código inexistente
    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Residência arquivada é somente leitura: não há o que cadastrar aqui
    if (residencia.isArchived) {
        redirect(`/app/residences/${residencia.code}/expenses`);
    }

    const { competencia } = await getResidenceExpenses(code);

    return (
        <div className="primaryCard">
            <CadastrarDespesaForm residencia={residencia} competencia={competencia} />
        </div>
    )


}
