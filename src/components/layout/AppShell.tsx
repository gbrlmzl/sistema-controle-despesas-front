'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { useCurrentUser } from "@/components/providers/UserProvider";
import useNotificacoes from "@/hooks/useNotificacoes";
import SinoNotificacoes from "@/components/ui/SinoNotificacoes";
import CadastrarDespesaModal from "@/components/despesas/CadastrarDespesaModal";
import {
    IconePainel, IconeDespesas, IconeRelatorios, IconeMembros,
    IconeResidencias, IconeConfiguracoes, IconeConta, IconeMais, IconeSino,
} from "./Icones";
import styles from "./AppShell.module.css";

interface ItemNavegacao {
    href: string;
    rotulo: string;
    icone: ReactNode;
    /* Casa a rota exata; sem isso "/dashboard/residences" marcaria como ativo
       enquanto o usuário está dentro de "/dashboard/residences/ABC/reports". */
    exato?: boolean;
}

//A navegação muda conforme o usuário está dentro de uma residência ou fora dela:
//só faz sentido oferecer Despesas/Relatórios/Membros quando existe um código na URL.
function extrairCodigoResidencia(pathname: string): string | null {
    const partes = pathname.split('/').filter(Boolean);
    const indice = partes.indexOf('residences');

    if (indice === -1) {
        return null;
    }

    const proximo = partes[indice + 1];

    //"new" e "join" são rotas irmãs de /residences, não códigos de residência
    if (!proximo || proximo === 'new' || proximo === 'join') {
        return null;
    }

    return proximo;
}

function iniciaisDoNome(nome: string): string {
    return nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0]?.toUpperCase() ?? '')
        .join('');
}

interface AppShellProps {
    children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const usuario = useCurrentUser();
    //Chamado uma vez só: o sino é renderizado duas vezes (rail e topo) e cada instância
    //com o próprio hook duplicaria o polling do endpoint de notificações.
    const notificacoes = useNotificacoes();
    const [cadastrandoDespesa, setCadastrandoDespesa] = useState(false);

    const codigo = extrairCodigoResidencia(pathname);
    const base = codigo ? `/dashboard/residences/${codigo}` : null;

    const navegacao: ItemNavegacao[] = base
        ? [
            { href: base, rotulo: "Painel", icone: <IconePainel />, exato: true },
            { href: `${base}/expenses`, rotulo: "Despesas", icone: <IconeDespesas /> },
            { href: `${base}/reports`, rotulo: "Relatórios", icone: <IconeRelatorios /> },
            { href: `${base}/members`, rotulo: "Membros", icone: <IconeMembros /> },
        ]
        : [
            { href: "/dashboard/residences", rotulo: "Residências", icone: <IconeResidencias /> },
            { href: "/dashboard/alerts", rotulo: "Alertas", icone: <IconeSino size={19} /> },
            { href: "/profile", rotulo: "Conta", icone: <IconeConta /> },
        ];

    const estaAtivo = (item: ItemNavegacao) =>
        item.exato ? pathname === item.href : pathname.startsWith(item.href);

    //Complementa a navegação até 4 colunas na tab bar do mobile, mantendo o acesso
    //à conta sempre disponível mesmo dentro de uma residência.
    const navegacaoMobile = base
        ? [...navegacao.slice(0, 3), { href: "/profile", rotulo: "Conta", icone: <IconeConta />, exato: false }]
        : navegacao;

    return (
        <div className={styles.shell}>
            <nav className={styles.rail} aria-label="Navegação principal">
                <div className={styles.railTopo}>
                    <Link href="/dashboard/residences" className={styles.marca} aria-label="Cronos — início">C</Link>

                    {navegacao.map(item => (
                        <Link key={item.href} href={item.href} title={item.rotulo} aria-label={item.rotulo}
                            aria-current={estaAtivo(item) ? "page" : undefined}
                            className={`${styles.railLink} ${estaAtivo(item) ? styles.railAtivo : ''}`}>
                            {item.icone}
                        </Link>
                    ))}

                    {base && (
                        <>
                            <span className={styles.railSeparador} />
                            <Link href={`${base}/settings`} title="Configurações" aria-label="Configurações"
                                aria-current={pathname.startsWith(`${base}/settings`) ? "page" : undefined}
                                className={`${styles.railLink} ${pathname.startsWith(`${base}/settings`) ? styles.railAtivo : ''}`}>
                                <IconeConfiguracoes />
                            </Link>
                            <Link href="/dashboard/residences" title="Todas as residências" aria-label="Todas as residências"
                                className={styles.railLink}>
                                <IconeResidencias />
                            </Link>
                        </>
                    )}
                </div>

                <div className={styles.railRodape}>
                    <SinoNotificacoes {...notificacoes} />
                    <Link href="/profile" className={styles.avatar} title={usuario?.name ?? "Minha conta"}
                        aria-label="Minha conta">
                        {usuario?.profilePic
                            ? <img src={usuario.profilePic} alt="" />
                            : iniciaisDoNome(usuario?.name ?? "?")}
                    </Link>
                </div>
            </nav>

            <header className={styles.topo}>
                <Link href="/dashboard/residences" className={styles.topoMarca}>
                    <span className={styles.marca}>C</span>
                    Cronos
                </Link>
                <SinoNotificacoes {...notificacoes} />
                <Link href="/profile" className={styles.avatar} aria-label="Minha conta">
                    {usuario?.profilePic
                        ? <img src={usuario.profilePic} alt="" />
                        : iniciaisDoNome(usuario?.name ?? "?")}
                </Link>
            </header>

            <main className={styles.conteudo}>
                <div className={styles.interno}>
                    {children}
                </div>
            </main>

            {/* Lançar despesa é a ação mais repetida do app: fica a um toque de
                qualquer tela da residência, em vez de exigir voltar ao painel — o
                modal sobe por cima da rota atual, sem navegar para outra tela.
                Em /members o botão flutuante de "+" já significa "convidar usuário"
                (ver ListaMembros) — manter os dois juntos confundiria o que o toque faz. */}
            {base && !pathname.startsWith(`${base}/members`) && (
                <button type="button" className={styles.fab} aria-label="Lançar despesa"
                    onClick={() => setCadastrandoDespesa(true)}>
                    <IconeMais />
                </button>
            )}

            {codigo && (
                <CadastrarDespesaModal codigo={codigo} aberto={cadastrandoDespesa}
                    onFechar={() => setCadastrandoDespesa(false)} />
            )}

            <nav className={styles.tabbar} aria-label="Navegação">
                {navegacaoMobile.map(item => (
                    <Link key={item.href} href={item.href}
                        aria-current={estaAtivo(item) ? "page" : undefined}
                        className={`${styles.tabLink} ${estaAtivo(item) ? styles.tabAtivo : ''}`}>
                        {item.icone}
                        {item.rotulo}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
