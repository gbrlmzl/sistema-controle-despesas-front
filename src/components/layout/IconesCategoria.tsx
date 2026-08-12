import type { ExpenseCategory } from "@/types/expenseCategory";

interface IconeCategoriaProps {
    categoria: ExpenseCategory;
    size?: number;
}

//Um ícone por categoria de despesa, no mesmo traço (stroke, currentColor) dos
//demais ícones do app — usado na grade de categorias do cadastro de despesa.
export function IconeCategoria({ categoria, size = 15 }: IconeCategoriaProps) {
    const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

    switch (categoria) {
        case "ALIMENTACAO":
            return <svg {...props}><path d="M3 2v7a3 3 0 0 0 6 0V2M6 9v13M18 2c-1.7 0-3 2.7-3 6s1.3 5 3 5v9" /></svg>;
        case "DOMESTICAS":
            return <svg {...props}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>;
        case "ASSINATURAS":
            return <svg {...props}><path d="M21 12a9 9 0 1 1-6.2-8.6" /><path d="m9 12 2 2 5-5" /></svg>;
        case "LAZER":
            return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
        case "OUTROS":
        default:
            return <svg {...props}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
    }
}
