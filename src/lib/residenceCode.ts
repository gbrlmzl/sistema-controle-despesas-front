//RN-012 -> O código é comparado sem diferenciar maiúsculas de minúsculas e
//ignorando espaços nas pontas, para tolerar erro de digitação e colagem.
export function normalizeResidenceCode(code: unknown): string {
    if (typeof code !== "string") {
        return "";
    }
    return code.trim().toUpperCase();
}
