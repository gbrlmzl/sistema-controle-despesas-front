import { apiFetch } from "./apiClient";
import type { Competencia } from "@/types/competencia";
import type { ResumoDespesas, DespesaRecorrente } from "@/types/residencia";
import type { ExpenseCategory } from "@/types/expenseCategory";

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
            porMembro: data.byMember.map(grupo => ({
                userId: grupo.userId,
                name: grupo.name,
                totalInCents: grupo.totalInCents,
                despesas: grupo.expenses,
            })),
        },
    };
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
