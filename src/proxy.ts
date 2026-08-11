import { NextResponse, type NextRequest } from "next/server";

//Rotas que só fazem sentido pra quem ainda não está logado
const ROTAS_SOMENTE_DESLOGADO = ["/login", "/cadastro"];

//Camada de autenticação: só resolve "tem sessão ou não" antes da página renderizar,
//checando a mera presença do cookie JWT — sem decodificar/validar a assinatura (a
//biblioteca de JWT usada pela API não roda no Edge Runtime, que é onde o proxy roda).
//Autorização de verdade (o token é válido? o usuário pode ver isto?) é sempre
//responsabilidade da API a cada chamada. Um cookie presente mas expirado/inválido só
//passa por aqui e falha depois, na primeira chamada à API — ver src/lib/apiClient.ts.
export default function proxy(req: NextRequest) {
    const estaLogado = req.cookies.has("JWT");
    const { pathname } = req.nextUrl;

    const precisaLogin = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

    if (precisaLogin && !estaLogado) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (ROTAS_SOMENTE_DESLOGADO.includes(pathname) && estaLogado) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/profile/:path*", "/login", "/cadastro"],
};
