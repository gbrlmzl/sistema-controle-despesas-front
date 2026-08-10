import { notFound } from "next/navigation";
import { getResidenceDetail } from "@/lib/residenceApi";
import { getResidenceExpenses } from "@/lib/expensesApi";
import type { ParamsResidencia } from "@/types/routes";
import type { AtividadeItem } from "@/types/residencia";

import PainelResidencia from "./PainelResidencia";

const LIMITE_ATIVIDADE_RECENTE = 5;

export default async function Residencia({ params }: ParamsResidencia) {
    const { code } = await params;

    //RN-010 -> quem não é membro recebe o mesmo resultado de um código inexistente,
    //para que não seja possível descobrir residências existentes testando URLs.
    const detalhe = await getResidenceDetail(code);
    if (!detalhe) {
        notFound();
    }

    const { residence: residencia, sentInvites: convites, pendingJoinRequests: solicitacoes } = detalhe;

    //P-1 e P-2 -> resumo da competência aberta e últimos lançamentos.
    //A "atividade recente" é derivada dos lançamentos da própria competência aberta
    //(a API não expõe um feed de atividade entre competências) — mais recentes primeiro.
    const { competencia, resumo } = await getResidenceExpenses(code);

    const atividade: AtividadeItem[] = resumo.porMembro
        .flatMap(grupo => grupo.despesas.map(despesa => ({
            id: despesa.id,
            name: despesa.name,
            valueInCents: despesa.valueInCents,
            category: despesa.category,
            month: competencia.month,
            year: competencia.year,
            createdAt: despesa.createdAt,
            autor: grupo.name,
        })))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, LIMITE_ATIVIDADE_RECENTE);

    return (
        <div className="primaryCard">
            <PainelResidencia
                residencia={residencia}
                solicitacoes={solicitacoes}
                convites={convites}
                competencia={competencia}
                resumo={{
                    totalInCents: resumo.totalInCents,
                    quantidade: resumo.quantidade,
                    isClosed: resumo.isClosed,
                    porMembro: resumo.porMembro.map(grupo => ({
                        userId: grupo.userId,
                        name: grupo.name,
                        totalInCents: grupo.totalInCents,
                    })),
                }}
                atividade={atividade} />
        </div>
    )


}
