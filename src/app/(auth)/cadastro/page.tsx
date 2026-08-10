import RegisterForm from "@/app/(auth)/cadastro/RegisterForm";

import styles from './page.module.css';

//Quem já está logado é redirecionado antes de chegar aqui pelo proxy (src/proxy.ts)
export default function paginaRegistro() {
    return (

        <div className={styles.container}>
            <RegisterForm />
        </div>

    )

}
