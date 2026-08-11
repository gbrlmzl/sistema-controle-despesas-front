import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";

import ConfiguracoesResidencia from "./ConfiguracoesResidencia";

type PageProps = {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ convidar?: string }>;
};

export default async function ConfiguracoesDaResidencia({ params, searchParams }: PageProps) {
    const { code } = await params;
    const { convidar } = await searchParams;

    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia } = detalhe;

    //Qualquer membro entra aqui: o owner encontra a administração completa e o
    //membro comum encontra ver membros e sair da residência. Quem decide o que
    //aparece é o próprio componente, a partir do papel.

    return (
        <div className="primaryCard">
            <ConfiguracoesResidencia
                residencia={residencia}
                abrirConviteInicial={convidar === '1' && !residencia.isArchived} />
        </div>
    )


}
