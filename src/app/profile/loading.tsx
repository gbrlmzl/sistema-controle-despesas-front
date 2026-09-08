import styles from './page.module.css';
import ProfileCarregando from './ProfileCarregando';

/* Reusa o mesmo componente que serve de fallback do <Suspense> em page.tsx.

   Os dois existem e não são redundantes: este loading.tsx cobre a NAVEGAÇÃO até
   /profile (o Next o exibe assim que o clique acontece), e o <Suspense> de page.tsx
   cobre a espera da SESSÃO depois que a rota já montou. Ter os dois desenhados pelo
   mesmo componente garante que a transição entre as duas fases não pisque. */
export default function Carregando() {
    return (
        <div className={styles.container}>
            <ProfileCarregando />
        </div>
    );
}
