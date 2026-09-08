import { AreaCarregando, Skeleton } from '@/components/ui/Skeleton';
import styles from './Profile.module.css';

/* Fallback do <Suspense> de /profile. Reusa o Profile.module.css de propósito:
   as medidas (avatar de 150px, as três linhas de dado com padding 0.6/0.75rem, o
   espaçamento de 2rem antes das ações) saem das MESMAS regras que o conteúdo
   real, então não há como as duas versões divergirem quando o CSS mudar. */
export default function ProfileCarregando() {
    return (
        <AreaCarregando rotulo="Carregando seu perfil" className={styles.container}>
            {/* O título é estático: renderizar o texto de verdade evita um bloco
                cinza piscando onde a palavra já poderia estar. */}
            <h1>Minha conta</h1>

            <div className={styles.subContainer}>
                <div className={styles.profilePictureContainer}>
                    <Skeleton largura="150px" altura="150px" circulo />
                </div>

                <div className={styles.profileDetails}>
                    {/* Nome, username e e-mail — três linhas, larguras diferentes
                        para não formar um bloco sólido. */}
                    <span><SkeletonLinha largura="62%" /></span>
                    <span><SkeletonLinha largura="45%" /></span>
                    <span><SkeletonLinha largura="78%" /></span>
                </div>

                <div className={styles.profileActions}>
                    <Skeleton largura="100%" altura="2.6rem" raio="var(--r-md)" />
                    <Skeleton largura="100%" altura="2.6rem" raio="var(--r-md)" />
                </div>
            </div>
        </AreaCarregando>
    );
}

/* Os <span> de .profileDetails já trazem fundo e padding próprios; o bloco de
   dentro só precisa marcar a linha de texto. */
function SkeletonLinha({ largura }: { largura: string }) {
    return <Skeleton largura={largura} altura="0.95rem" />;
}
