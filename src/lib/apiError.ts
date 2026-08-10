//Erro lançado pelo apiClient (server e client) quando a API responde um status não-2xx.
//A API sempre devolve { message } em erro (nunca { error: {...} }), então esse é o único
//formato que precisa ser tratado aqui.
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export async function parseApiResponse<T>(res: Response): Promise<T> {
    if (res.status === 204) {
        return undefined as T;
    }

    if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        throw new ApiError(res.status, body?.message || "Erro na comunicação com o servidor.");
    }

    return res.json() as Promise<T>;
}
