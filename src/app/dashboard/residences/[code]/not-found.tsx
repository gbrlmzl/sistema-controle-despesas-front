import Link from "next/link";

import styles from "./PainelResidencia.module.css";


export default function ResidenciaNaoEncontrada() {
    return (
        <div className="primaryCard">
            <div className={styles.container}>
                <div className={styles.cabecalho}>
                    <Link href="/app/residences" className={styles.botaoCanto}
                        aria-label="Ver minhas residências" title="Ver minhas residências">
                        <img src="/icons/voltarIcon.svg" alt="Ver minhas residências" width={22} height={22} />
                    </Link>
                    <h2>Residência não encontrada</h2>
                    <span className={styles.espacoCanto} />
                </div>
                <p className={styles.mensagemNaoEncontrada}>
                    O código informado não corresponde a nenhuma residência da qual você participa.
                </p>
            </div>
        </div>
    )
}
