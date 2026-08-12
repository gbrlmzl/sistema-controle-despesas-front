'use client'

import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

import { formatarValor } from "@/utils/dinheiro";
import { rotuloCategoria, nomeDoMes } from "@/utils/categorias";
import styles from "./GraficosRelatorio.module.css";
import type { CategoriaComDesvio, Evolucao } from "@/types/relatorios";

interface GraficosRelatorioProps {
    categorias: CategoriaComDesvio[];
    evolucao: Evolucao;
}

//O Recharts escreve estes valores direto nos atributos SVG `fill`/`stroke`, que não
//resolvem var(--...). Os hex precisam acompanhar --cat-1..5 e --accent de globals.css.
const CORES = ["#4F8EF7", "#34D399", "#A78BFA", "#FB7185", "#64748B"];
const COR_LINHA = "#4F8EF7";
const COR_EIXO = "#5D6780";

//O tooltip do Recharts é renderizado em div fora do CSS Module, com estilo inline
//claro por padrão — ilegível sobre o fundo escuro.
const ESTILO_TOOLTIP = {
    background: "#16203A",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: "12px",
    color: "#E9EDF7",
    fontSize: "0.82rem",
};

//FEAT-028 -> composição por categoria e evolução ao longo das competências.
//⚠️ isAnimationActive={false} não é preferência estética: com o Recharts 3.10.1 e o
//React 19.1 a animação de entrada da pizza impede o desenho dos setores, e o gráfico
//fica em branco sem nenhum erro no console. Verificado no navegador.
export default function GraficosRelatorio({ categorias, evolucao }: GraficosRelatorioProps) {

    const dadosPizza = categorias.map(categoria => ({
        nome: rotuloCategoria(categoria.category),
        valor: categoria.totalInCents / 100,
    }));

    const dadosEvolucao = evolucao.map(item => ({
        nome: nomeDoMes(item.month).slice(0, 3),
        valor: item.totalInCents / 100,
    }));

    const houveMovimento = evolucao.some(item => item.totalInCents > 0);

    return (
        <div className={styles.container}>
            {categorias.length > 0 && (
                <div className={styles.bloco}>
                    <h3>Composição por categoria</h3>
                    <div className={styles.area}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={dadosPizza} dataKey="valor" nameKey="nome"
                                    cx="50%" cy="50%" outerRadius="80%" isAnimationActive={false}>
                                    {dadosPizza.map((item, indice) => (
                                        <Cell key={item.nome} fill={CORES[indice % CORES.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))}
                                    contentStyle={ESTILO_TOOLTIP} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* CA-4 -> os mesmos valores seguem disponíveis em texto, para leitor de tela */}
                    <ul className={styles.legenda}>
                        {dadosPizza.map((item, indice) => (
                            <li key={item.nome}>
                                <span className={styles.marcador} style={{ background: CORES[indice % CORES.length] }} />
                                {item.nome}: {formatarValor(Math.round(item.valor * 100))}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {houveMovimento && (
                <div className={styles.bloco}>
                    <h3>Evolução dos últimos meses</h3>
                    <div className={styles.area}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosEvolucao}>
                                <XAxis dataKey="nome" fontSize={12} stroke={COR_EIXO} />
                                <YAxis fontSize={12} width={40} stroke={COR_EIXO} />
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))}
                                    contentStyle={ESTILO_TOOLTIP} />
                                <Line type="monotone" dataKey="valor" stroke={COR_LINHA} strokeWidth={2}
                                    isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {categorias.length > 0 && (
                <div className={styles.bloco}>
                    <h3>Comparação entre categorias</h3>
                    <div className={styles.area}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosPizza}>
                                <XAxis dataKey="nome" fontSize={11} stroke={COR_EIXO} />
                                <YAxis fontSize={12} width={40} stroke={COR_EIXO} />
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))}
                                    contentStyle={ESTILO_TOOLTIP} cursor={{ fill: "rgba(255,255,255,.05)" }} />
                                <Bar dataKey="valor" fill={COR_LINHA} isAnimationActive={false} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
