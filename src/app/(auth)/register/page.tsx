import RegisterForm from "./RegisterForm";

//A moldura (apresentação + centralização) vem de (auth)/layout.tsx.
//Quem já está logado é redirecionado antes de chegar aqui pelo proxy (src/proxy.ts)
export default function paginaRegistro() {
    const googleAuthEnabled = process.env.GOOGLE_AUTH_ENABLED === "true";
    return <RegisterForm googleAuthEnabled={googleAuthEnabled} />;
}
