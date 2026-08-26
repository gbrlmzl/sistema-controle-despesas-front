import { apiFetch } from "./apiClient";
import type { Competencia } from "@/types/competencia";
import type { ResumoDespesas, DespesaRecorrente, CompetenciaComDespesas } from "@/types/residencia";
import type { ExpenseCategory } from "@/types/expenseCategory";
import type { AcertosDaCompetencia } from "@/types/acerto";

interface ExpensesApiResponse {
    competency: Competencia;
    byMember: {
        userId: number;
        name: string;
        totalInCents: number;
        expenses: {
            id: string;
            name: string;
            valueInCents: number;
            category: ExpenseCategory;
            isRecurring: boolean;
            createdById: number;
            createdAt: string;
        }[];
    }[];
    totalInCents: number;
    count: number;
    isClosed: boolean;
    closedAt: string | null;
    closedByName: string | null;
    //Já vem no formato usado pelo front -- é o único bloco desta resposta que
    //nasceu do lado da API sem precisar de tradução EN->PT (ver plano de arquitetura, §6.7).
    settlement: AcertosDaCompetencia | null;
}

export interface ExpensesResult {
    competencia: Competencia;
    resumo: ResumoDespesas;
}

//GET /residences/:code/expenses — sem competência informada, a API assume a aberta.
export async function getResidenceExpenses(code: string, competencia?: Competencia): Promise<ExpensesResult> {
    const query = competencia ? `?month=${competencia.month}&year=${competencia.year}` : "";
    const data = await apiFetch<ExpensesApiResponse>(`/residences/${code}/expenses${query}`);

    return {
        competencia: data.competency,
        resumo: {
            totalInCents: data.totalInCents,
            quantidade: data.count,
            isClosed: data.isClosed,
            closedAt: data.closedAt,
            closedByName: data.closedByName,
            settlement: data.settlement,
            porMembro: data.byMember.map(grupo => ({
                userId: grupo.userId,
                name: grupo.name,
                totalInCents: grupo.totalInCents,
                despesas: grupo.expenses,
            })),
        },
    };
}

interface CompetencyApiResponse {
    month: number;
    year: number;
    isClosed: boolean;
}

//GET /residences/:code/expenses/competencies — só as competências com ao menos uma
//despesa lançada, já com o status de fechamento. Usado para destacar o seletor de
//competência sem precisar consultar mês a mês.
export async function getResidenceCompetencies(code: string): Promise<CompetenciaComDespesas[]> {
    const data = await apiFetch<CompetencyApiResponse[]>(`/residences/${code}/expenses/competencies`);

    return data.map(item => ({
        month: item.month,
        year: item.year,
        temDespesas: true,
        isClosed: item.isClosed,
    }));
}

interface RecurringExpensesApiResponse {
    competency: Competencia;
    expenses: DespesaRecorrente[];
}

export interface RecurringExpensesResult {
    competencia: Competencia;
    despesasRecorrentes: DespesaRecorrente[];
}

//GET /residences/:code/expenses/recurring — despesas recorrentes do próprio usuário
//na competência informada (ou na aberta, se omitida).
export async function getResidenceRecurringExpenses(code: string, competencia?: Competencia): Promise<RecurringExpensesResult> {
    const query = competencia ? `?month=${competencia.month}&year=${competencia.year}` : "";
    const data = await apiFetch<RecurringExpensesApiResponse>(`/residences/${code}/expenses/recurring${query}`);

    return {
        competencia: data.competency,
        despesasRecorrentes: data.expenses,
    };
}
