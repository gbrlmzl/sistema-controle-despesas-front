import type { ExpenseCategory } from "./expenseCategory";

export interface MembroResidencia {
    userId: number;
    name: string;
    username: string | null;
    isOwner: boolean;
    isCurrentUser: boolean;
}

export interface Residencia {
    name: string;
    code: string;
    ownerName: string;
    isOwner: boolean;
    isArchived: boolean;
    members: MembroResidencia[];
}

export interface SolicitacaoPendente {
    id: number;
    requesterName: string;
    requesterUsername: string | null;
    createdAt: string;
}

export interface ConviteEnviado {
    id: number;
    invitedUserName: string;
    invitedUserUsername: string | null;
    createdAt: string;
}

export interface AtividadeItem {
    id: string;
    name: string;
    valueInCents: number;
    category: ExpenseCategory;
    month: number;
    year: number;
    createdAt: string;
    autor: string;
}

export interface ResumoCompetencia {
    totalInCents: number;
    quantidade: number;
    isClosed: boolean;
    porMembro: { userId: number; name: string; totalInCents: number }[];
}

export interface DespesaItem {
    id: string;
    name: string;
    valueInCents: number;
    category: ExpenseCategory;
    isRecurring: boolean;
    createdById: number;
    createdAt: string;
}

export interface GrupoDespesas {
    userId: number;
    name: string;
    totalInCents: number;
    despesas: DespesaItem[];
}

export interface ResumoDespesas {
    porMembro: GrupoDespesas[];
    totalInCents: number;
    quantidade: number;
    isClosed: boolean;
    closedAt: string | null;
    closedByName: string | null;
}

export interface CompetenciaComDespesas {
    month: number;
    year: number;
    temDespesas: boolean;
    isClosed: boolean;
}

export interface DespesaRecorrente {
    id: string;
    name: string;
    valueInCents: number;
    category: ExpenseCategory;
    isRecurring: boolean;
}
