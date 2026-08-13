import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import type { ParamsResidencia } from "@/types/routes";

import ConfiguracoesResidencia from "./ConfiguracoesResidencia";

export default async function ConfiguracoesDaResidencia({ params }: ParamsResidencia) {
    const { code } = await params;

    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Qualquer membro entra aqui: o owner encontra a administração completa e o
    //membro comum encontra ver membros e sair da residência. Quem decide o que
    //aparece é o próprio componente, a partir do papel.

    return (
        <div className="superficie">
            <ConfiguracoesResidencia residencia={residencia} />
        </div>
    )


}
