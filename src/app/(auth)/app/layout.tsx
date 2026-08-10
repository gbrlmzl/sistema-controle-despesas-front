import "./app.css";
import type { ReactNode } from "react";

//A exigência de sessão pra tudo em /app/** é responsabilidade do middleware
//(src/proxy.ts) — ele roda antes desta página renderizar.
export default function ControleDespesasLayout({ children }: { children: ReactNode }) {
    return (
        <div className="paginaConteudo">
            <main>
                {children}
            </main>
            <footer>
                <a href="https://github.com/gbrlmzl" target="_blank" rel="noopener noreferrer" style={{fontFamily: "var(--font-roboto-condensed)"}}>github.com/gbrlmzl</a>
            </footer>
        </div>
    );
}
