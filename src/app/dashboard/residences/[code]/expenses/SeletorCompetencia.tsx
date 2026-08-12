'use client'

import { useState } from "react";

import { nomeDoMes, competenciaTexto } from "@/utils/categorias";
import styles from "./SeletorCompetencia.module.css";
import type { Competencia } from "@/types/competencia";
import type { CompetenciaComDespesas } from "@/types/residencia";

interface SeletorCompetenciaProps {
    competencia: Competencia;
    competencias: CompetenciaComDespesas[];
    onSelecionar: (mes: number, ano: number) => void;
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const QUANTIDADE_ATALHOS = 4;

//Os meses mais recentes cobrem a consulta do dia a dia; o calendário continua ao lado
//para alcançar qualquer mês/ano anterior.
function competenciasRecentes(referencia: Competencia, quantidade: number): Competencia[] {
    return Array.from({ length: quantidade }, (_, posicao) => {
        //Conta os meses desde o ano 0 para atravessar a virada de ano sem tratar dezembro à parte
        const deslocamento = referencia.year * 12 + (referencia.month - 1) - (quantidade - 1 - posicao);
        return {
            month: (deslocamento % 12) + 1,
            year: Math.floor(deslocamento / 12),
        };
    });
}

//Seletor de mês/ano em grade. Os meses com despesas ficam destacados e os demais
//acinzentados, mas todos continuam clicáveis: sem isso não seria possível abrir um
//mês ainda vazio, nem voltar a ele depois de excluir o último lançamento.
export default function SeletorCompetencia({ competencia, competencias, onSelecionar }: SeletorCompetenciaProps) {
    const [aberto, setAberto] = useState(false);
    const [anoExibido, setAnoExibido] = useState(competencia.year);

    //Competência com lançamentos em aberto entra em verde; com o mês já fechado,
    //em destaque neutro. As duas são mutuamente exclusivas por competência.
    const mesesAbertos = new Set(
        competencias.filter(item => item.temDespesas && !item.isClosed).map(item => `${item.year}-${item.month}`)
    );
    const mesesFechados = new Set(
        competencias.filter(item => item.temDespesas && item.isClosed).map(item => `${item.year}-${item.month}`)
    );

    const atalhos = competenciasRecentes(competencia, QUANTIDADE_ATALHOS);

    const selecionar = (mes: number) => {
        setAberto(false);
        onSelecionar(mes, anoExibido);
    }

    const alternarPainel = () => {
        setAnoExibido(competencia.year); //reabrir sempre parte do ano em exibição
        setAberto(anterior => !anterior);
    }

    return (
        <div className={styles.container}>
            <div className={styles.atalhos}>
                <button type="button" className={styles.gatilho} onClick={alternarPainel}
                    aria-expanded={aberto} aria-haspopup="dialog" title="Escolher outro mês">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M3 10h18" />
                    </svg>
                    <span className={styles.gatilhoTexto}>{competenciaTexto(competencia.month, competencia.year)}</span>
                </button>
            </div>

            {aberto && (
                <>
                    <div className={styles.fundo} onClick={() => setAberto(false)} aria-hidden="true" />

                    <div className={styles.painel} role="dialog" aria-label="Selecionar competência">
                        <div className={styles.navegacaoAno}>
                            <button type="button" onClick={() => setAnoExibido(ano => ano - 1)} aria-label="Ano anterior">‹</button>
                            <span className={styles.ano}>{anoExibido}</span>
                            <button type="button" onClick={() => setAnoExibido(ano => ano + 1)} aria-label="Próximo ano">›</button>
                        </div>

                        <div className={styles.grade}>
                            {MESES_CURTOS.map((rotulo, indice) => {
                                const mes = indice + 1;
                                const chave = `${anoExibido}-${mes}`;
                                const aberto = mesesAbertos.has(chave);
                                const fechado = mesesFechados.has(chave);
                                const selecionado = mes === competencia.month && anoExibido === competencia.year;

                                return (
                                    <button key={mes} type="button"
                                        className={[
                                            styles.mes,
                                            aberto ? styles.mesAberto : fechado ? styles.mesFechado : styles.semDespesas,
                                            selecionado ? styles.selecionado : '',
                                        ].join(' ')}
                                        onClick={() => selecionar(mes)}
                                        title={`${nomeDoMes(mes)} de ${anoExibido}`}>
                                        {rotulo}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
