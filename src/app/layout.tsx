import "modern-css-reset/dist/reset.min.css";
import { Montserrat, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import UserProvider from "@/components/providers/UserProvider";
import ThemeProvider, { SCRIPT_INICIALIZACAO_TEMA } from "@/components/providers/ThemeProvider";
import { getSessionPromise } from "@/lib/session";
import type { ReactNode } from "react";

//Duas famílias cobrem o app inteiro: Montserrat nos títulos, Roboto no corpo e nos
//números. Os pesos são os efetivamente usados pelos tokens em globals.css.
const montserrat = Montserrat({
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const roboto = Roboto({
  weight: ["300", "400", "500"],
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cronos",
  description: "O amigo que te ajuda a controlar suas despesas!",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  /* SEM await, e o layout deixou de ser async por causa disso. Um `await` aqui
     bloqueava a navegação inteira: o App Router não mostra nenhum loading.tsx
     enquanto o layout que lê dado de runtime não termina de renderizar ("Without
     Cache Components: Navigation blocks until the layout finishes rendering" —
     nextjs.org/docs/app/api-reference/file-conventions/loading). Como este layout
     é a raiz, TODA página do app pagava esse bloqueio: medimos 354 ms de tela
     congelada, sem um pixel de mudança, ao trocar de aba dentro da residência.

     Passando a promise adiante, o layout termina imediatamente, a casca vai pro
     navegador, e só quem lê o usuário suspende — dentro do <Suspense> de cada um.
     Ver docs/refatoracao-contexto-usuario.md. */
  const sessao = getSessionPromise();

  //A navegação não vive mais aqui: cada área tem a sua (landing tem cabeçalho
  //próprio, /dashboard e /profile usam o AppShell, e (auth) não tem nenhuma).
  return (
    /* As variáveis de fonte ficam no <html>, não no <body>: os tokens de globals.css
       moram em :root e uma custom property só é visível de si para baixo na árvore.
       suppressHydrationWarning é necessário porque o script abaixo escreve
       data-theme no <html> antes do React hidratar — sem isso, React reclamaria
       de um atributo que ele não gerou. */
    <html lang="pt-BR" className={`${montserrat.variable} ${roboto.variable}`} suppressHydrationWarning>
      <body>
        <Script id="tema-inicial" strategy="beforeInteractive">
          {SCRIPT_INICIALIZACAO_TEMA}
        </Script>
        <ThemeProvider>
          <UserProvider sessao={sessao}>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
