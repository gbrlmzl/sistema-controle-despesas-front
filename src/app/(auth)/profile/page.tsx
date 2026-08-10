import styles from './page.module.css';

import Profile from './Profile';

//A exigência de sessão é responsabilidade do proxy (src/proxy.ts). Profile lê o
//usuário do contexto (UserProvider), alimentado pelo layout raiz via getCurrentUser().
export default function Home() {
    return (
        <div className={styles.container}>
            <Profile/>
        </div>
    )


}
