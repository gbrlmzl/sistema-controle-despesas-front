import { redirect } from "next/navigation";

//A tela-menu que existia aqui só tinha três links (residências, criar, entrar).
//Os três passaram a viver na própria lista de residências, então /dashboard deixa
//de ser um passo intermediário e leva direto ao destino.
export default function Home() {
    redirect("/dashboard/residences");
}
