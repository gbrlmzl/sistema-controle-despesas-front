import { redirect } from "next/navigation";
import styles from './page.module.css';
import ChangePasswordForm from './ChangePasswordForm';
import { getCurrentUser } from "@/lib/session";

//A exigência de sessão é responsabilidade do proxy (src/proxy.ts). A exigência extra
//de "conta com senha local" (contas só-Google não têm o que trocar) só a API sabe
//responder, por isso é checada aqui via getCurrentUser().
export default async function Home() {
    const user = await getCurrentUser();
    if (!user?.hasPassword) {
        redirect("/");
    }

    return (
        <div className={styles.container}>
            <ChangePasswordForm/>
        </div>
    )
}
