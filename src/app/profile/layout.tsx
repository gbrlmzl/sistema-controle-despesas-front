import AppShell from "@/components/layout/AppShell";
import "../dashboard/app.css";
import type { ReactNode } from "react";

//"Minha conta" também é área autenticada: usa o mesmo shell de /dashboard para o
//usuário não perder a navegação ao abrir o perfil.
export default function PerfilLayout({ children }: { children: ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
