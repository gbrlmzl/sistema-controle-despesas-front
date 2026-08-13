"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Tema = "dark" | "light";

const CHAVE_ARMAZENAMENTO = "cronos-theme";

interface ThemeContextValue {
    tema: Tema;
    alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

//Usado pelo botão de alternância na navbar (AppShell) e por qualquer componente
//que precise adaptar comportamento ao tema atual (ex.: escolher ícone de sol/lua).
export function useTheme(): ThemeContextValue {
    const contexto = useContext(ThemeContext);
    if (!contexto) {
        throw new Error("useTheme deve ser usado dentro de ThemeProvider");
    }
    return contexto;
}

//O <html data-theme> é a fonte da verdade (o script inline em layout.tsx já o
//define antes da hidratação). useSyncExternalStore lê esse atributo em vez de
//duplicá-lo num useState: assim não há setState em efeito nem risco de os dois
//ficarem dessincronizados. O getServerSnapshot resolve a hidratação sem piscar
//— React usa "dark" no primeiro paint do cliente (igual ao servidor) e só depois
//troca para o valor real, lido do DOM.
const ouvintes = new Set<() => void>();

function inscrever(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
}

function obterSnapshotCliente(): Tema {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function obterSnapshotServidor(): Tema {
    return "dark";
}

function aplicarTemaGlobal(novoTema: Tema): void {
    document.documentElement.setAttribute("data-theme", novoTema);
    try {
        window.localStorage.setItem(CHAVE_ARMAZENAMENTO, novoTema);
    } catch {
        //Modo privado ou storage bloqueado: a troca ainda funciona na sessão atual,
        //só não persiste para a próxima visita.
    }
    ouvintes.forEach(ouvinte => ouvinte());
}

interface ThemeProviderProps {
    children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
    const tema = useSyncExternalStore(inscrever, obterSnapshotCliente, obterSnapshotServidor);

    const alternarTema = useCallback(() => {
        aplicarTemaGlobal(tema === "dark" ? "light" : "dark");
    }, [tema]);

    return (
        <ThemeContext.Provider value={{ tema, alternarTema }}>
            {children}
        </ThemeContext.Provider>
    );
}

//Roda antes da hidratação (ver <Script strategy="beforeInteractive"> em layout.tsx)
//para decidir o tema e aplicá-lo no <html> sem esperar o React — caso contrário a
//tela pisca no tema errado por um instante a cada carregamento.
export const SCRIPT_INICIALIZACAO_TEMA = `
(function () {
  try {
    var salvo = window.localStorage.getItem('${CHAVE_ARMAZENAMENTO}');
    var tema = salvo === 'light' || salvo === 'dark'
      ? salvo
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', tema);
  } catch (e) {}
})();
`;
