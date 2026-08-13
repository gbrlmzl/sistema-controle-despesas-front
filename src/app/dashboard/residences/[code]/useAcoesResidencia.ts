import { useState } from "react";
import { useRouter } from "next/navigation";

import sairDaResidenciaAction from "./sairDaResidenciaAction";
import removerMembroAction from "./removerMembroAction";
import transferirPropriedadeAction from "./transferirPropriedadeAction";
import arquivarResidenciaAction from "./arquivarResidenciaAction";
import responderSolicitacaoAction from "./responderSolicitacaoAction";
import cancelarConviteAction from "./cancelarConviteAction";
import regenerarCodigoAction from "./regenerarCodigoAction";
import type { ActionState } from "@/types/actions";
import type { Residencia, MembroResidencia, SolicitacaoPendente, ConviteEnviado } from "@/types/residencia";

interface Confirmacao {
    titulo: string;
    mensagem: string;
    textoConfirmar: string;
    onConfirmar: () => Promise<unknown>;
}

interface Snackbar {
    open: boolean;
    message: string;
    type: string;
}

//Ações da residência compartilhadas entre o painel e a tela de configurações.
//Cada tela consome apenas o que exibe.
export default function useAcoesResidencia(residencia: Pick<Residencia, "code" | "name" | "isArchived">, abrirConviteInicial = false) {
    const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
    const [renomeando, setRenomeando] = useState(false);
    //Vem aberto quando o usuário chegou pelo "convidar" do modal de criação (CA-1 da US-007)
    const [convidando, setConvidando] = useState(abrirConviteInicial);
    const [processando, setProcessando] = useState(false);
    const [snackbar, setSnackbar] = useState<Snackbar>({ open: false, message: "", type: "" });
    const router = useRouter();


    const fecharConfirmacao = () => setConfirmacao(null);
    const abrirRenomear = () => setRenomeando(true);
    const fecharRenomear = () => setRenomeando(false);
    const abrirConvidar = () => setConvidando(true);
    const fecharConvidar = () => setConvidando(false);

    //Executa a ação no servidor e traduz a resposta em feedback para o usuário.
    //redirecionarPara é usado quando a URL atual deixa de valer (saída ou novo código).
    const executarAcao = async <T,>(
        acao: () => Promise<ActionState<T>>,
        { redirecionarPara }: { redirecionarPara?: string | ((resposta: ActionState<T>) => string) } = {}
    ) => {
        setProcessando(true);
        const resposta = await acao();
        setProcessando(false);
        fecharConfirmacao();

        if (!resposta?.success) {
            mostrarSnackbar({ msg: resposta?.message || "Não foi possível concluir a ação", type: "error", time: 4000 });
            return resposta;
        }

        mostrarSnackbar({ msg: resposta.message, type: "success", time: 3000 });

        const destino = typeof redirecionarPara === "function" ? redirecionarPara(resposta) : redirecionarPara;

        if (destino) {
            router.push(destino);
            return resposta;
        }

        router.refresh(); //recarrega os dados da residência vindos do servidor
        return resposta;
    }

    //CA-2 da US-013 -> a saída exige confirmação explícita
    const confirmarSaida = () => setConfirmacao({
        titulo: "Sair da residência",
        mensagem: `Você deixará de ver as despesas de "${residencia.name}". Deseja mesmo sair?`,
        textoConfirmar: "Sair",
        onConfirmar: () => executarAcao(() => sairDaResidenciaAction(residencia.code), { redirecionarPara: "/dashboard/residences" }),
    });

    //CA-3 da US-014 -> a confirmação traz o nome do membro
    const confirmarRemocao = (membro: MembroResidencia) => setConfirmacao({
        titulo: "Remover membro",
        mensagem: `Remover "${membro.name}" da residência "${residencia.name}"? Ele perderá o acesso às despesas.`,
        textoConfirmar: "Remover",
        onConfirmar: () => executarAcao(() => removerMembroAction(residencia.code, membro.userId)),
    });

    //CA-2 da US-015 -> a confirmação traz o nome do novo dono
    const confirmarTransferencia = (membro: MembroResidencia) => setConfirmacao({
        titulo: "Transferir propriedade",
        mensagem: `"${membro.name}" passará a ser o administrador da residência e você continuará nela como membro comum. Confirmar?`,
        textoConfirmar: "Transferir",
        onConfirmar: () => executarAcao(() => transferirPropriedadeAction(residencia.code, membro.userId)),
    });

    const confirmarArquivamento = () => {
        const arquivar = !residencia.isArchived;

        setConfirmacao({
            titulo: arquivar ? "Arquivar residência" : "Desarquivar residência",
            mensagem: arquivar
                ? `"${residencia.name}" ficará somente leitura: ninguém poderá cadastrar despesas nem entrar nela. Você pode desarquivar depois.`
                : `"${residencia.name}" voltará a aceitar novas despesas e novos membros.`,
            textoConfirmar: arquivar ? "Arquivar" : "Desarquivar",
            onConfirmar: () => executarAcao(() => arquivarResidenciaAction(residencia.code, arquivar)),
        });
    }

    //CA-2 da US-017 -> a confirmação avisa que o código atual deixará de funcionar.
    //Como a rota é identificada pelo código, o destino muda junto (RN-009).
    const confirmarRegeneracao = () => setConfirmacao({
        titulo: "Gerar novo código",
        mensagem: `O código atual (${residencia.code}) deixará de funcionar e as solicitações pendentes serão canceladas. Os membros atuais continuam na residência.`,
        textoConfirmar: "Gerar novo código",
        onConfirmar: () => executarAcao(
            () => regenerarCodigoAction(residencia.code),
            //data só falta quando success é false, e este redirecionamento só roda no caminho de sucesso
            { redirecionarPara: (resposta) => `/dashboard/residences/${resposta.data!.code}/settings` }
        ),
    });

    //US-009 -> responder solicitação é ação direta, sem confirmação intermediária
    const responderSolicitacao = (solicitacao: SolicitacaoPendente, aceitar: boolean) => {
        executarAcao(() => responderSolicitacaoAction(residencia.code, solicitacao.id, aceitar));
    }

    //US-022 -> cancelar convite enviado
    const cancelarConvite = (convite: ConviteEnviado) => {
        executarAcao(() => cancelarConviteAction(residencia.code, convite.id));
    }

    const mostrarSnackbar = ({ msg, type, time }: { msg: string; type: string; time?: number }) => {
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
        confirmacao,
        fecharConfirmacao,
        processando,
        renomeando,
        abrirRenomear,
        fecharRenomear,
        convidando,
        abrirConvidar,
        fecharConvidar,
        confirmarSaida,
        confirmarRemocao,
        confirmarTransferencia,
        confirmarArquivamento,
        confirmarRegeneracao,
        responderSolicitacao,
        cancelarConvite,
        snackbar,
        fecharSnackbar,
    }

}
