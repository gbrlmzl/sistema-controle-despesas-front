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

const CORES = ["#2497F3", "#4CAF50", "#FF9800", "#9C27B0", "#607D8B"];

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
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))} />
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
                                <XAxis dataKey="nome" fontSize={12} />
                                <YAxis fontSize={12} width={40} />
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))} />
                                <Line type="monotone" dataKey="valor" stroke="#2497F3" strokeWidth={2}
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
                                <XAxis dataKey="nome" fontSize={11} />
                                <YAxis fontSize={12} width={40} />
                                <Tooltip formatter={(valor) => formatarValor(Math.round(Number(valor) * 100))} />
                                <Bar dataKey="valor" fill="#2497F3" isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
