'use client'

import { IconeMais } from "@/components/layout/Icones";
import styles from './ListaMembros.module.css';
import type { MembroResidencia } from "@/types/residencia";

interface ListaMembrosProps {
    membros: MembroResidencia[];
    podeGerenciar: boolean;
    onRemover: (membro: MembroResidencia) => void;
    onTransferir: (membro: MembroResidencia) => void;
    onConvidar?: () => void;
}

//CA-1 da US-014 -> lista de membros da residência.
//As ações de gestão só aparecem para o owner e nunca sobre ele mesmo (CA-5 da US-014).
export default function ListaMembros({ membros, podeGerenciar, onRemover, onTransferir, onConvidar }: ListaMembrosProps) {

    return (
        <div className={styles.container}>
            <div className={styles.cabecalhoLista}>
                <h3>Membros</h3>
                {/* US-007 -> convidar mora junto da lista que o convite alimenta */}
                {podeGerenciar && onConvidar && (
                    <button type="button" className={styles.botaoConvidar} onClick={onConvidar}
                        aria-label="Convidar usuário" title="Convidar usuário">
                        <IconeMais size={16} />
                    </button>
                )}
            </div>
            <ul className={styles.lista}>
                {membros.map(membro => (
                    <li key={membro.userId} className={styles.membroContainer}>
                        <div className={styles.membroInfo}>
                            <div className={styles.membroNome}>
                                {membro.isOwner && (
                                    <img src="/icons/adminIcon.svg" alt="Administrador da residência" width={14} height={14} />
                                )}
                                <span>{membro.name}</span>
                                {membro.isCurrentUser && (<span className={styles.marcadorVoce}>você</span>)}
                            </div>
                            {membro.username && (<span className={styles.membroUsername}>@{membro.username}</span>)}
                        </div>

                        {podeGerenciar && !membro.isCurrentUser && (
                            <div className={styles.membroAcoes}>
                                <button type="button" className={styles.botaoTransferir} onClick={() => onTransferir(membro)}>
                                    Tornar administrador
                                </button>
                                <button type="button" className={styles.botaoRemover} onClick={() => onRemover(membro)}>
                                    Remover
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
