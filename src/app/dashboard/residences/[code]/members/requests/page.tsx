import { notFound, redirect } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import type { ParamsResidencia } from "@/types/routes";

import SolicitacoesConvites from "./SolicitacoesConvites";

export default async function ConvitesESolicitacoes({ params }: ParamsResidencia) {
    const { code } = await params;

    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia, sentInvites: convites, pendingJoinRequests: solicitacoes } = detalhe;

    //US-009 e US-022 -> só o owner administra convites e solicitações da residência.
    //O ícone que leva aqui já só aparece pra ele; isto cobre quem digitar a URL direto.
    if (!residencia.isOwner) {
        redirect(`/dashboard/residences/${code}/members`);
    }

    return (
        <div className="superficie">
            <SolicitacoesConvites residencia={residencia} solicitacoes={solicitacoes} convites={convites} />
        </div>
    )
}
