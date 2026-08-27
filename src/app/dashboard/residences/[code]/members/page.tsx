import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import type { ParamsResidencia } from "@/types/routes";

import GerenciarMembros from "./GerenciarMembros";

type PageProps = ParamsResidencia & {
    searchParams: Promise<{ convidar?: string }>;
};

export default async function Membros({ params, searchParams }: PageProps) {
    const { code } = await params;
    const { convidar } = await searchParams;

    //RN-010 -> quem não é membro recebe o mesmo resultado de código inexistente.
    //Qualquer membro pode ver quem mora na casa; só o owner enxerga as ações de gestão.
    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia, pendingJoinRequests: solicitacoes } = detalhe;

    return (
        <div className="superficie">
            <GerenciarMembros residencia={residencia}
                quantidadeSolicitacoes={solicitacoes.length}
                abrirConviteInicial={convidar === '1' && residencia.isOwner && !residencia.isArchived} />
        </div>
    )


}
