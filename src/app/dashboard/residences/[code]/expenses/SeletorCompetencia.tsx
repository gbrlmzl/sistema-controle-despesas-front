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

//Seletor de mês/ano em grade. Os meses com despesas ficam destacados e os demais
//acinzentados, mas todos continuam clicáveis: sem isso não seria possível abrir um
//mês ainda vazio, nem voltar a ele depois de excluir o último lançamento.
export default function SeletorCompetencia({ competencia, competencias, onSelecionar }: SeletorCompetenciaProps) {
    const [aberto, setAberto] = useState(false);
    const [anoExibido, setAnoExibido] = useState(competencia.year);

    const mesesComDespesas = new Set(
        competencias.filter(item => item.temDespesas).map(item => `${item.year}-${item.month}`)
    );

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
            <button type="button" className={styles.gatilho} onClick={alternarPainel} aria-expanded={aberto}>
                {competenciaTexto(competencia.month, competencia.year)}
            </button>

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
                                const temDespesas = mesesComDespesas.has(`${anoExibido}-${mes}`);
                                const selecionado = mes === competencia.month && anoExibido === competencia.year;

                                return (
                                    <button key={mes} type="button"
                                        className={[
                                            styles.mes,
                                            temDespesas ? styles.comDespesas : styles.semDespesas,
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
