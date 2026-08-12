import "modern-css-reset/dist/reset.min.css";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";
import UserProvider from "@/components/providers/UserProvider";
import { getCurrentUser } from "@/lib/session";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  //A navegação não vive mais aqui: cada área tem a sua (landing tem cabeçalho
  //próprio, /dashboard e /profile usam o AppShell, e (auth) não tem nenhuma).
  return (
    /* As variáveis de fonte ficam no <html>, não no <body>: os tokens de globals.css
       moram em :root e uma custom property só é visível de si para baixo na árvore. */
    <html lang="pt-BR" className={`${montserrat.variable} ${roboto.variable}`}>
      <body>
        <UserProvider user={user}>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
