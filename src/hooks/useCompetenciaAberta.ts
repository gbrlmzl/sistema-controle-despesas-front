"use client";
import { useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import type { Competencia } from "@/types/competencia";

interface RespostaExpenses {
    competency: Competencia;
}

//O modal de nova despesa abre a partir de qualquer rota da residência (inclusive
//pelo + flutuante do AppShell, que não tem acesso aos dados já carregados por uma
//página específica), então busca a competência aberta sozinho quando é aberto.
export function useCompetenciaAberta(codigo: string | null) {
    const [competencia, setCompetencia] = useState<Competencia | null>(null);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (!codigo) {
            setCompetencia(null);
            return;
        }

        let cancelado = false;
        setCarregando(true);

        apiFetchClient<RespostaExpenses>(`/residences/${codigo}/expenses`)
            .then(data => {
                if (!cancelado) {
                    setCompetencia(data.competency);
                }
            })
            .catch(() => {
                if (!cancelado) {
                    setCompetencia(null);
                }
            })
            .finally(() => {
                if (!cancelado) {
                    setCarregando(false);
                }
            });

        return () => {
            cancelado = true;
        };
    }, [codigo]);

    return { competencia, carregando };
}
