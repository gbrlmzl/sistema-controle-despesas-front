import type { ExpenseCategory } from "./expenseCategory";

export interface CategoriaComDesvio {
    category: ExpenseCategory;
    totalInCents: number;
    quantidade: number;
    percentual: number;
    mediaInCents: number | null;
    desvio: number | null;
    acimaDaMedia: boolean | null;
}

export interface RelatorioComDesvios {
    categorias: CategoriaComDesvio[];
    totalInCents: number;
}

export interface CategoriaComparativo {
    category: ExpenseCategory;
    atualInCents: number;
    anteriorInCents: number;
    variacaoInCents: number;
    isNova: boolean;
    percentual: number | null;
}

export interface Comparativo {
    totalAtualInCents: number;
    totalAnteriorInCents: number;
    variacaoInCents: number;
    percentual: number | null;
    temBaseDeComparacao: boolean;
    categorias: CategoriaComparativo[];
}

export type Evolucao = { month: number; year: number; totalInCents: number }[];

export interface ParticipanteRateio {
    userId: number;
    name: string;
    gastoInCents: number;
    cotaInCents: number;
    saldoInCents: number;
    recebe: boolean;
    paga: boolean;
}

export interface Rateio {
    cotaInCents: number;
    totalInCents: number;
    participantes: ParticipanteRateio[];
    temRateio: boolean;
}

export interface DespesaExportacao {
    createdAt: string;
    name: string;
    category: ExpenseCategory;
    valueInCents: number;
    isRecurring: boolean;
    autor: string;
}
