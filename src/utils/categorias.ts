import { ExpenseCategory } from "@/types/expenseCategory";

//FEAT-024 -> categorias fixas. Manter o conjunto igual para todas as residências
//é o que permite comparar os relatórios futuros (FEAT-026) entre casas diferentes.
export const CATEGORIAS: { value: ExpenseCategory; label: string }[] = [
    { value: "ALIMENTACAO", label: "Alimentação" },
    { value: "DOMESTICAS", label: "Contas domésticas" },
    { value: "ASSINATURAS", label: "Assinaturas" },
    { value: "LAZER", label: "Lazer" },
    { value: "OUTROS", label: "Outros" },
];

export function rotuloCategoria(valor: ExpenseCategory): string {
    return CATEGORIAS.find(categoria => categoria.value === valor)?.label ?? valor;
}

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function nomeDoMes(mes: number): string {
    return MESES[mes - 1] ?? "";
}

export function competenciaTexto(mes: number, ano: number): string {
    return `${nomeDoMes(mes)} de ${ano}`;
}

//Forma compacta, para linhas estreitas onde o nome do mês por extenso não caberia
export function competenciaCurta(mes: number, ano: number): string {
    return `${String(mes).padStart(2, "0")}/${ano}`;
}
