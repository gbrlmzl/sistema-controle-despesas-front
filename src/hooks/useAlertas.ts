import { useCallback, useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";
import type { NotificationType } from "@/types/notificationType";

interface Notificacao {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    linkTo: string | null;
    readAt: string | null;
    createdAt: string;
    isRead: boolean;
}

interface RespostaListagem {
    notifications: Notificacao[];
    total: number;
    page: number;
    totalPages: number;
    unread: number;
}

interface RespostaAtualizacao {
    unread: number;
}

export default function useAlertas() {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [naoLidas, setNaoLidas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);


    const buscarNotificacoes = useCallback(async (paginaDesejada: number) => {
        setLoading(true);
        try {
            const conteudo = await apiFetchClient<RespostaListagem>(`/notifications?page=${paginaDesejada}`);

            setNotificacoes(conteudo.notifications);
            setTotalPaginas(conteudo.totalPages);
            setNaoLidas(conteudo.unread);
            setErro(null);

        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Erro ao buscar notificações");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        buscarNotificacoes(pagina);
    }, [pagina, buscarNotificacoes]);


    //CA-5 da US-021 -> marcar todas como lidas
    const marcarTodasComoLidas = async () => {
        try {
            await apiFetchClient<RespostaAtualizacao>("/notifications", {
                method: "PATCH",
                body: { all: true },
            });

            await buscarNotificacoes(pagina);

        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Erro ao atualizar notificações");
        }
    }

    const irParaPagina = (novaPagina: number) => {
        if (novaPagina < 1 || novaPagina > totalPaginas) {
            return;
        }
        setPagina(novaPagina);
    }


    return {
        notificacoes,
        pagina,
        totalPaginas,
        naoLidas,
        loading,
        erro,
        marcarTodasComoLidas,
        irParaPagina,
    }

}
