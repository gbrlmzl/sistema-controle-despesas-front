import "modern-css-reset/dist/reset.min.css";
import { Montserrat, Roboto_Condensed, Roboto, Poppins, Russo_One } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import UserProvider from "@/components/providers/UserProvider";
import { getCurrentUser } from "@/lib/session";
import type { ReactNode } from "react";

const montserratSemibold = Montserrat({
  weight: ["600"],
  variable: "--font-montserrat_semibold",
  subsets: ["latin"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ["400", "600"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const russoOne = Russo_One({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-russo-one",
});

export const metadata = {
  title: "Cronos",
  description: "O amigo que te ajuda a controlar suas despesas!",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={`${montserratSemibold.variable} ${robotoCondensed.variable} ${roboto.variable} ${poppins.variable} ${russoOne.variable}`}>
        <UserProvider user={user}>
          <header>
            <Navbar />
          </header>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
