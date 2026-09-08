import { Suspense } from 'react';
import styles from './page.module.css';

import Profile from './Profile';
import ProfileCarregando from './ProfileCarregando';

//A exigência de sessão é responsabilidade do proxy (src/proxy.ts). Profile lê o
//usuário do contexto (UserProvider), que hoje entrega uma promise em vez de um
//valor pronto — por isso o <Suspense>: useCurrentUser() suspende até a sessão
//chegar, e sem um boundary aqui o vazio subiria até o loading.tsx do /profile,
//apagando a casca inteira em vez de só o cartão. Ver
//docs/refatoracao-contexto-usuario.md.
export default function Home() {
    return (
        <div className={styles.container}>
            <Suspense fallback={<ProfileCarregando />}>
                <Profile />
            </Suspense>
        </div>
    )
}
