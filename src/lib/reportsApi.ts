import { apiFetch } from "./apiClient";
import type { Competencia } from "@/types/competencia";
import type { ExpenseCategory } from "@/types/expenseCategory";
import type { RelatorioComDesvios, Comparativo, Evolucao, Rateio, DespesaExportacao } from "@/types/relatorios";

interface ReportApiResponse {
    competency: Competencia;
    tab: 'residence' | 'personal';
    report: {
        categories: {
            category: ExpenseCategory;
            totalInCents: number;
            count: number;
            percentage: number;
            averageInCents: number | null;
            deviation: number | null;
            aboveAverage: boolean | null;
        }[];
        totalInCents: number;
    };
    comparison: {
        totalCurrentInCents: number;
        totalPreviousInCents: number;
        variationInCents: number;
        percentage: number | null;
        hasComparisonBase: boolean;
        categories: {
            category: ExpenseCategory;
            currentInCents: number;
            previousInCents: number;
            variationInCents: number;
            isNew: boolean;
            percentage: number | null;
        }[];
    };
    evolution: Evolucao;
    split: {
        shareInCents: number;
        totalInCents: number;
        hasSplit: boolean;
        participants: {
            userId: number;
            name: string;
            spentInCents: number;
            shareInCents: number;
            balanceInCents: number;
            receives: boolean;
            pays: boolean;
        }[];
    };
    householdTotalInCents: number;
    expenses: {
        createdAt: string;
        name: string;
        category: ExpenseCategory;
        valueInCents: number;
        isRecurring: boolean;
        authorName: string;
    }[];
}

export interface RelatorioResult {
    competencia: Competencia;
    relatorio: RelatorioComDesvios;
    comparativo: Comparativo;
    evolucao: Evolucao;
    rateio: Rateio;
    totalDaCasaInCents: number;
    despesas: DespesaExportacao[];
}

//GET /residences/:code/reports — um único endpoint substitui as 7 consultas Prisma
//que a versão anterior fazia em paralelo (relatório por categoria, comparativo,
//evolução, rateio e exportação já vêm prontos do lado da API).
export async function getResidenceReport(code: string, competencia: Competencia, aba: 'pessoal' | 'residencia'): Promise<RelatorioResult> {
    const tab = aba === 'pessoal' ? 'personal' : 'residence';
    const data = await apiFetch<ReportApiResponse>(
        `/residences/${code}/reports?month=${competencia.month}&year=${competencia.year}&tab=${tab}`
    );

    return {
        competencia: data.competency,
        relatorio: {
            totalInCents: data.report.totalInCents,
            categorias: data.report.categories.map(categoria => ({
                category: categoria.category,
                totalInCents: categoria.totalInCents,
                quantidade: categoria.count,
                percentual: categoria.percentage,
                mediaInCents: categoria.averageInCents,
                desvio: categoria.deviation,
                acimaDaMedia: categoria.aboveAverage,
            })),
        },
        comparativo: {
            totalAtualInCents: data.comparison.totalCurrentInCents,
            totalAnteriorInCents: data.comparison.totalPreviousInCents,
            variacaoInCents: data.comparison.variationInCents,
            percentual: data.comparison.percentage,
            temBaseDeComparacao: data.comparison.hasComparisonBase,
            categorias: data.comparison.categories.map(item => ({
                category: item.category,
                atualInCents: item.currentInCents,
                anteriorInCents: item.previousInCents,
                variacaoInCents: item.variationInCents,
                isNova: item.isNew,
                percentual: item.percentage,
            })),
        },
        evolucao: data.evolution,
        rateio: {
            cotaInCents: data.split.shareInCents,
            totalInCents: data.split.totalInCents,
            temRateio: data.split.hasSplit,
            participantes: data.split.participants.map(participante => ({
                userId: participante.userId,
                name: participante.name,
                gastoInCents: participante.spentInCents,
                cotaInCents: participante.shareInCents,
                saldoInCents: participante.balanceInCents,
                recebe: participante.receives,
                paga: participante.pays,
            })),
        },
        totalDaCasaInCents: data.householdTotalInCents,
        despesas: data.expenses.map(despesa => ({
            createdAt: despesa.createdAt,
            name: despesa.name,
            category: despesa.category,
            valueInCents: despesa.valueInCents,
            isRecurring: despesa.isRecurring,
            autor: despesa.authorName,
        })),
    };
}
