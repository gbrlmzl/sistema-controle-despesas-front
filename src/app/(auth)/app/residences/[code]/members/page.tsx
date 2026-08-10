import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import type { ParamsResidencia } from "@/types/routes";

import GerenciarMembros from "./GerenciarMembros";


export default async function Membros({ params }: ParamsResidencia) {
    const { code } = await params;

    //RN-010 -> quem não é membro recebe o mesmo resultado de código inexistente.
    //Qualquer membro pode ver quem mora na casa; só o owner enxerga as ações de gestão.
    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    return (
        <div className="primaryCard">
            <GerenciarMembros residencia={detalhe.residence} />
        </div>
    )


}
