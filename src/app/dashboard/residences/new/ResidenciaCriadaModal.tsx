'use client'

import styles from './ResidenciaCriadaModal.module.css';

interface ResidenciaCriadaModalProps {
    residencia: { name: string; code: string };
    onConvidar: () => void;
    onConfirmar: () => void;
}

//FEAT-005 -> Modal de sucesso exibido logo após a criação da residência.
//CA-1 da US-007 -> a ação de convidar parte daqui, levando ao painel já com o convite aberto.
export default function ResidenciaCriadaModal({ residencia, onConvidar, onConfirmar }: ResidenciaCriadaModalProps) {

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="tituloResidenciaCriada">
            <div className={styles.modal}>
                <div className={styles.mensagemContainer}>
                    <h3 id="tituloResidenciaCriada">Residência criada com sucesso!</h3>
                    <p className={styles.nomeResidencia}>{residencia.name}</p>
                    <p className={styles.codigoResidencia}>{residencia.code}</p>
                </div>

                <div className="botoesContainer">
                    <button type="button" onClick={onConvidar} title="Convidar usuários">
                        <span className="botaoIcone">
                            <img src="/icons/adicionarIcon.svg" alt="Convidar usuários" />
                        </span>
                    </button>
                    <button type="button" onClick={onConfirmar}>
                        <span className="botaoIcone">
                            <img src="/icons/confirmarIcon.svg" alt="Confirmar" />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}
