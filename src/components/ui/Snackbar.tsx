'use client'

import { useEffect, useState } from "react";
import styles from './Snackbar.module.css';

interface SnackbarProps {
  open: boolean;
  message: string;
  onClose: () => void;
  type?: string;
}

export default function Snackbar({ open, message, onClose, type }: SnackbarProps) {
  //Enquanto o fade-out acontece o elemento precisa continuar montado,
  //senão ele sumiria de uma vez e a transição nunca seria vista.
  const [renderizar, setRenderizar] = useState(open);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (open) {
      setRenderizar(true);
      setSaindo(false);
      return;
    }

    if (!renderizar) {
      return;
    }

    setSaindo(true);
    const temporizador = setTimeout(() => {
      setRenderizar(false);
      setSaindo(false);
    }, 300);

    return () => clearTimeout(temporizador);
  }, [open, renderizar]);

  if (!renderizar) return null;

  //Cor por tipo continua inline: é a única propriedade que varia em tempo de execução.
  //Os valores acompanham --pos / --neg / --accent de globals.css.
  const coresPorTipo: Record<string, string> = {
    success: "#1B8A63",
    error: "#C43E55",
    warning: "#2F6FD0",
  };

  return (
    <div className={`${styles.container} ${saindo ? styles.saindo : ''}`}
      role="status" aria-live="polite"
      style={{ backgroundColor: coresPorTipo[type ?? ''] || "#1E2A45" }}>
      <div className={styles.mensagemContainer}>
        {message}
      </div>
      <button className={styles.botaoFechar} onClick={onClose} aria-label="Fechar">
        <img src="/icons/xIcon.svg" alt="" />
      </button>
    </div>
  );
}
