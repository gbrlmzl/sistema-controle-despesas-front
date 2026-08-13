'use client'

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconeCategoria } from "@/components/layout/IconesCategoria";
import { CATEGORIAS, corCategoria, corCategoriaFundo, rotuloCategoria } from "@/utils/categorias";
import styles from './SeletorCategoria.module.css';
import type { ExpenseCategory } from "@/types/expenseCategory";

interface SeletorCategoriaProps {
    value: ExpenseCategory | '';
    onChange: (categoria: ExpenseCategory) => void;
    //Nome do input hidden que carrega o valor pro <Form> ao redor.
    name?: string;
    //Espaçamento em relação aos campos vizinhos é responsabilidade de quem usa
    //(cada formulário organiza o próprio ritmo vertical de um jeito diferente).
    className?: string;
}

//Seletor de categoria com duas versões: grade com ícones no mobile (boa pro toque)
//e dropdown só com nomes no desktop, pensado pra um cadastro 100% via teclado — abre
//com Enter, navega com as setas, Tab pula pro próximo campo do formulário sem passar
//por cada opção. Compartilhado entre CadastrarDespesaModal e DespesasRecorrentes.
export default function SeletorCategoria({ value, onChange, name = "category", className }: SeletorCategoriaProps) {
    const [aberto, setAberto] = useState(false);
    const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0 });
    const gatilhoRef = useRef<HTMLButtonElement>(null);
    const opcaoRefs = useRef<Array<HTMLButtonElement | null>>([]);

    //Ao abrir, o foco já entra na opção selecionada — ou na primeira, se ainda não
    //houver escolha — para navegar só com as setas. `preventScroll` é essencial
    //aqui: o reset global aplica scroll-behavior:smooth a qualquer elemento com
    //foco dentro (html:focus-within), então o ajuste automático de scroll que o
    //navegador faria ao focar (mesmo a opção já estando visível dentro do painel)
    //vira uma animação que dispara vários eventos de "scroll" ao longo de uns
    //150-300ms — tempo de sobra pra vazar por qualquer adiamento de um tick só
    //(setTimeout/rAF) e ser capturado pelo listener do efeito abaixo, fechando o
    //painel sozinho logo depois de abrir.
    useEffect(() => {
        if (!aberto) {
            return;
        }

        const indiceSelecionado = CATEGORIAS.findIndex(categoria => categoria.value === value);
        opcaoRefs.current[indiceSelecionado === -1 ? 0 : indiceSelecionado]?.focus({ preventScroll: true });
    }, [aberto, value]);

    //O painel mora num portal em document.body: posicionado como position:absolute
    //dentro do formulário, ele "vazava" no cálculo de overflow de qualquer ancestral
    //com scroll (o .modal do CadastrarDespesaModal, por exemplo) e abria um scroll
    //feio nele, mesmo sem precisar de scroll nenhum. Fora da árvore, quem rola é só a
    //lista. O listener de scroll vai na window em fase de captura — assim pega o
    //scroll de qualquer ancestral rolável, sem precisar que quem usa o componente
    //passe uma ref pra ele; se isso acontecer (ou a janela for redimensionada) com o
    //painel aberto, ele fecha em vez de ficar flutuando desalinhado do gatilho.
    useEffect(() => {
        if (!aberto) {
            return;
        }

        const gatilho = gatilhoRef.current;
        if (!gatilho) {
            return;
        }

        const rect = gatilho.getBoundingClientRect();
        setPosicao({ top: rect.bottom + 4, left: rect.left, width: rect.width });

        const fechar = () => setAberto(false);
        window.addEventListener('scroll', fechar, { capture: true, passive: true });
        window.addEventListener('resize', fechar);

        return () => {
            window.removeEventListener('scroll', fechar, true);
            window.removeEventListener('resize', fechar);
        };
    }, [aberto]);

    function selecionar(categoria: ExpenseCategory) {
        onChange(categoria);
        setAberto(false);
        gatilhoRef.current?.focus();
    }

    //As opções ficam fora da ordem de tab (tabIndex={-1}) e só são alcançadas pelas
    //setas — assim, dar Tab a partir do gatilho pula direto pro próximo campo do
    //formulário, mesmo com o dropdown aberto.
    function teclado(e: React.KeyboardEvent<HTMLDivElement>) {
        const indiceAtual = opcaoRefs.current.findIndex(el => el === document.activeElement);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            opcaoRefs.current[(indiceAtual + 1) % CATEGORIAS.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            opcaoRefs.current[(indiceAtual - 1 + CATEGORIAS.length) % CATEGORIAS.length]?.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setAberto(false);
            gatilhoRef.current?.focus();
        } else if (e.key === 'Tab') {
            setAberto(false);
        }
    }

    return (
        <div className={`${styles.raiz} ${className ?? ''}`}>
            <input type="hidden" name={name} value={value} />

            {/* Mobile: grade com ícones, otimizada pro toque */}
            <div className={styles.grade}>
                {CATEGORIAS.map(categoria => (
                    <button key={categoria.value} type="button" aria-pressed={value === categoria.value}
                        className={`${styles.botaoCategoria} ${value === categoria.value ? styles.botaoCategoriaAtivo : ''}`}
                        onClick={() => onChange(categoria.value)}>
                        <span className={styles.icone}
                            style={{ background: corCategoriaFundo(categoria.value), color: corCategoria(categoria.value) }}>
                            <IconeCategoria categoria={categoria.value} />
                        </span>
                        {categoria.label}
                    </button>
                ))}
            </div>

            {/* Desktop: dropdown só com nomes, pensado pra fluxo 100% via teclado */}
            <div className={styles.dropdown}>
                <button ref={gatilhoRef} type="button" className={styles.gatilho}
                    aria-haspopup="listbox" aria-expanded={aberto}
                    onClick={() => setAberto(anterior => !anterior)}>
                    <span className={value ? undefined : styles.gatilhoPlaceholder}>
                        {value ? rotuloCategoria(value) : "Selecione uma categoria"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>

                {aberto && createPortal(
                    <>
                        <div className={styles.fundo} onClick={() => setAberto(false)} aria-hidden="true" />
                        <div className={styles.painel} role="listbox" aria-label="Categoria" onKeyDown={teclado}
                            style={{ top: posicao.top, left: posicao.left, width: posicao.width }}>
                            {CATEGORIAS.map((categoria, indice) => (
                                <button key={categoria.value} type="button" role="option" tabIndex={-1}
                                    aria-selected={value === categoria.value}
                                    ref={elemento => { opcaoRefs.current[indice] = elemento; }}
                                    className={`${styles.opcao} ${value === categoria.value ? styles.opcaoAtiva : ''}`}
                                    onClick={() => selecionar(categoria.value)}>
                                    {categoria.label}
                                </button>
                            ))}
                        </div>
                    </>,
                    document.body
                )}
            </div>
        </div>
    );
}
