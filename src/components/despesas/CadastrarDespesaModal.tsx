'use client'

import { useActionState, useEffect, useRef, useState } from "react";
import Form from "next/form"
import { useRouter } from "next/navigation";

import cadastrarDespesaAction from "@/app/dashboard/residences/[code]/expenses/cadastrarDespesaAction";
import Snackbar from "@/components/ui/Snackbar";
import { IconeCategoria } from "@/components/layout/IconesCategoria";
import { useCompetenciaAberta } from "@/hooks/useCompetenciaAberta";
import { CATEGORIAS, competenciaTexto, corCategoria, corCategoriaFundo } from "@/utils/categorias";
import styles from './CadastrarDespesaModal.module.css';
import type { ExpenseCategory } from "@/types/expenseCategory";

interface CadastrarDespesaModalProps {
    codigo: string;
    aberto: boolean;
    onFechar: () => void;
}

//Atalhos de preenchimento para os nomes de despesa mais comuns — não vêm do
//histórico da residência, só poupam digitação nos lançamentos recorrentes.
const SUGESTOES = ["Mercado", "Conta de luz", "Internet", "Gás", "Faxina"];

//Modal de nova despesa, aberto sobre a rota em que o usuário está — pelo botão
//"Cadastrar despesa" (dentro de /expenses) ou pelo + flutuante do AppShell
//(que funciona em qualquer tela da residência, por isso busca a competência
//sozinho em vez de recebê-la por props).
export default function CadastrarDespesaModal({ codigo, aberto, onFechar }: CadastrarDespesaModalProps) {
    const [state, formAction, isPending] = useActionState(cadastrarDespesaAction, null);
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
    const valueInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const { competencia } = useCompetenciaAberta(aberto ? codigo : null);

    const dadosPreenchidos = name.trim().length >= 2 && value.trim().length > 0 && category !== '';

    //CA-2 -> o lançamento é incremental: após salvar, o formulário se limpa
    //para que o membro registre a próxima despesa sem fechar o modal.
    //A dependência é o objeto `state` inteiro, e não `state.success`: dois cadastros
    //seguidos bem-sucedidos teriam o mesmo `success === true`, e o efeito não voltaria
    //a rodar. Cada resposta da action é um objeto novo, então a identidade sempre muda.
    useEffect(() => {
        if (!state?.success) {
            return;
        }

        setName('');
        setValue('');
        setCategory('');
        setIsRecurring(false);
        router.refresh();

        //O foco volta para o valor assim que a despesa é salva — é o primeiro campo
        //do fluxo, então o próximo lançamento começa direto pelo teclado.
        valueInputRef.current?.focus();

        setSnackbar({ open: true, message: state.message, type: "success" });
        const temporizador = setTimeout(() => {
            setSnackbar(anterior => ({ ...anterior, open: false }));
        }, 3000);

        return () => clearTimeout(temporizador);
    }, [state, router]);

    if (!aberto) {
        return null;
    }

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloNovaDespesa">
            <div className={styles.modal}>
                <div className={styles.cabecalho}>
                    <h3 id="tituloNovaDespesa">Nova despesa</h3>
                    <button type="button" className={styles.botaoFechar} onClick={onFechar} aria-label="Fechar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
                <p className={styles.competencia}>
                    {competencia ? `Entra na competência aberta · ${competenciaTexto(competencia.month, competencia.year)}` : "Carregando competência…"}
                </p>

                {state?.success === false && (
                    <div className={styles.errorMessage}>
                        <span>{state?.message}</span>
                    </div>
                )}

                <Form action={formAction} className={styles.form}>
                    <input type="hidden" name="code" value={codigo} />

                    <div className={styles.valorStage}>
                        <span className={styles.rotulo}>Valor</span>
                        <div className={styles.valorInputLinha}>
                            <span className={styles.valorMoeda}>R$</span>
                            <input ref={valueInputRef} className={styles.valorInput} type="text" name="value" placeholder="0,00"
                                value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" autoComplete="off" autoFocus />
                        </div>
                    </div>

                    <div className={styles.campo}>
                        <label htmlFor="nova-despesa-modal-nome">Descrição</label>
                        <input id="nova-despesa-modal-nome" type="text" name="name" placeholder="Do que se trata?" value={name} maxLength={60}
                            onChange={(e) => setName(e.target.value)} autoComplete="off" />
                        <div className={styles.sugestoes}>
                            {SUGESTOES.map(sugestao => (
                                <button key={sugestao} type="button" className={styles.botaoSugestao} onClick={() => setName(sugestao)}>
                                    {sugestao}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span className={styles.rotulo}>Categoria</span>
                    <div className={styles.categoriaGrid}>
                        {CATEGORIAS.map(categoria => (
                            <button key={categoria.value} type="button" aria-pressed={category === categoria.value}
                                className={`${styles.botaoCategoria} ${category === categoria.value ? styles.botaoCategoriaAtivo : ''}`}
                                onClick={() => setCategory(categoria.value)}>
                                <span className={styles.categoriaIcone}
                                    style={{ background: corCategoriaFundo(categoria.value), color: corCategoria(categoria.value) }}>
                                    <IconeCategoria categoria={categoria.value} />
                                </span>
                                {categoria.label}
                            </button>
                        ))}
                    </div>
                    <input type="hidden" name="category" value={category} />

                    <label className={styles.recorrenteLinha}>
                        <span className={styles.recorrenteTexto}>
                            <strong>Repetir todo mês</strong>
                            <span>Relança sozinho na virada da competência</span>
                        </span>
                        <span className={styles.switchWrap}>
                            <input type="checkbox" name="isRecurring" checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)} />
                            <span className={styles.switchTrilho} />
                        </span>
                    </label>

                    <button type="submit" className={styles.botaoSubmit} disabled={isPending || !dadosPreenchidos}>
                        {isPending ? "Lançando..." : "Lançar despesa"}
                    </button>
                    <p className={styles.dica}>O campo limpa e o foco volta pro valor — dá pra lançar várias seguidas.</p>
                </Form>

                <Snackbar
                    open={snackbar.open}
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar(anterior => ({ ...anterior, open: false }))} />
            </div>
        </div>
    )
}
