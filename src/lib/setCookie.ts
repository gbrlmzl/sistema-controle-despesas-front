export interface ParsedSetCookie {
    name: string;
    value: string;
    options: {
        path?: string;
        maxAge?: number;
        expires?: Date;
        sameSite?: "lax" | "strict" | "none";
        secure?: boolean;
        httpOnly?: boolean;
    };
}

//Parser manual porque nem next/headers nem a Web Cookies API expõem um jeito de
//interpretar a string crua de um header Set-Cookie — precisa nos dois lugares que
//repassam cookies vindos da API pra resposta do Next (apiClient.ts no servidor e
//proxy.ts no middleware).
export function parseSetCookie(raw: string): ParsedSetCookie {
    const parts = raw.split(";").map(p => p.trim());
    const [name, ...valueParts] = parts[0].split("=");
    const value = valueParts.join("=");

    const options: ParsedSetCookie["options"] = {};
    for (const attr of parts.slice(1)) {
        const [rawKey, rawVal] = attr.split("=");
        switch (rawKey.toLowerCase()) {
            case "path":
                options.path = rawVal;
                break;
            case "max-age":
                options.maxAge = Number(rawVal);
                break;
            case "expires":
                options.expires = new Date(rawVal);
                break;
            case "samesite":
                options.sameSite = rawVal?.toLowerCase() as ParsedSetCookie["options"]["sameSite"];
                break;
            case "secure":
                options.secure = true;
                break;
            case "httponly":
                options.httpOnly = true;
                break;
        }
    }

    return { name, value, options };
}
