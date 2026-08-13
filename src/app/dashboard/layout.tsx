import AppShell from "@/components/layout/AppShell";
import "./app.css";
import type { ReactNode } from "react";

//A exigência de sessão pra tudo em /dashboard/** é responsabilidade do middleware
//(src/proxy.ts) — ele roda antes desta página renderizar.
export default function ControleDespesasLayout({ children }: { children: ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
