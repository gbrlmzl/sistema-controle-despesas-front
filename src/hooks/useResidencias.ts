import { useCallback, useEffect, useState } from "react";
import { apiFetchClient } from "@/lib/apiClient.client";
import { ApiError } from "@/lib/apiError";

export interface Residencia {
    name: string;
    code: string;
    ownerName: string;
    isOwner: boolean;
    isArchived: boolean;
}

export interface ConviteRecebido {
    id: number;
    residenceName: string;
    residenceCode: string;
    invitedByName: string;
    createdAt: string;
}

export interface SolicitacaoEnviada {
    id: number;
    residenceName: string;
    residenceCode: string;
    createdAt: string;
}

interface RespostaResidencias {
    residences: Residencia[];
    receivedInvites: ConviteRecebido[];
    sentJoinRequests: SolicitacaoEnviada[];
}

interface Snackbar {
    open: boolean;
    message: string;
    type: string;
}

interface MostrarSnackbarParams {
    msg: string;
    type: string;
    time?: number;
}

export default function useResidencias() {
    const [residencias, setResidencias] = useState<Residencia[]>([]);
    const [convitesRecebidos, setConvitesRecebidos] = useState<ConviteRecebido[]>([]);
    const [solicitacoesEnviadas, setSolicitacoesEnviadas] = useState<SolicitacaoEnviada[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<Snackbar>({ open: false, message: "", type: "" });


    const recarregar = useCallback(async () => {
        try {
            const conteudo = await apiFetchClient<RespostaResidencias>("/residences");

            setResidencias(conteudo.residences);
            setConvitesRecebidos(conteudo.receivedInvites);
            setSolicitacoesEnviadas(conteudo.sentJoinRequests);
            setErro(null);

        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Erro ao buscar residências");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        recarregar();
    }, [recarregar]);


    //FEAT-007 -> Copia o código para a área de transferência. Se o navegador negar
    //o acesso (contexto não seguro, permissão negada), exibe o código para cópia manual.
    const copiarCodigo = async (codigo: string) => {
        try {
            await navigator.clipboard.writeText(codigo);
            mostrarSnackbar({ msg: "Código copiado!", type: "success", time: 3000 });
        } catch (error) {
            mostrarSnackbar({ msg: `Copie o código manualmente: ${codigo}`, type: "warning" });
        }
    }

    const mostrarSnackbar = ({ msg, type, time }: MostrarSnackbarParams) => {
        setSnackbar({ open: true, message: msg, type: type });
        if (time) {
            setTimeout(() => {
                setSnackbar({ open: false, message: "", type: "" });
            }, time);
        }

    }

    const fecharSnackbar = () => {
        setSnackbar({ open: false, message: "", type: "" });
    }


    return {
        residencias,
        convitesRecebidos,
        solicitacoesEnviadas,
        loading,
        erro,
        recarregar,
        copiarCodigo,
        snackbar,
        mostrarSnackbar,
        fecharSnackbar,
    }

}
