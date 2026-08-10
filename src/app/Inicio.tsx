'use client'
import Image from 'next/image';
import styles from './Inicio.module.css';
import Link from 'next/link';
import { useCurrentUser } from '@/components/providers/UserProvider';

export default function Inicio() {
    const user = useCurrentUser();

    return (
        <div className={styles.container}>
            <div className={styles.mobileContextContainer}>
                <h1>Bem-vindo ao Cronos!</h1>
                <Image src="/assets/appImage.svg" alt="App imagem" width={320} height={215} />
                <div className={styles.description}>
                    <p>O Cronos te ajuda a organizar as despesas mensais da residência que você divide com seus colegas,
                        registrando cada despesa e determinando quanto cada residente paga e recebe. </p>
                    {user ? (
                        <div className={styles.contextContainer}>
                            <Link href="/app" className={styles.linkButton}>Começar a utilizar</Link>
                        </div>
                    ) : (
                        <div className={styles.contextContainer}>
                            <Link href="/cadastro" className={styles.linkButton}>Criar conta</Link>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.desktopContextContainer}>
                <h1>Bem-vindo ao Cronos!</h1>
                <div className={styles.desktopContent}>

                    <Image src="/assets/appImage.svg" alt="App imagem" width={450} height={450} />
                                        <div className={styles.descriptionContainer}>
                        <div className={styles.description}>
                            <p>O Cronos te ajuda a organizar as despesas mensais da residência que você divide com seus colegas,
                                registrando cada despesa e determinando quanto cada residente paga e recebe. </p>
                        </div>
                    </div>

                </div>
                {user ? (
                    <div className={styles.contextContainer}>
                        <Link href="/app" className={styles.linkButton}>Começar a utilizar</Link>
                    </div>
                ) : (
                    <div className={styles.contextContainer}>
                        <Link href="/cadastro" className={styles.linkButton}>Criar conta</Link>
                    </div>
                )}



            </div>




        </div>
    )
}
