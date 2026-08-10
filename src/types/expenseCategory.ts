export const ExpenseCategory = {
    ALIMENTACAO: 'ALIMENTACAO',
    DOMESTICAS: 'DOMESTICAS',
    ASSINATURAS: 'ASSINATURAS',
    LAZER: 'LAZER',
    OUTROS: 'OUTROS',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];
