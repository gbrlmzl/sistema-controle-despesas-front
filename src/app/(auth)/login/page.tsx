import LoginForm from './LoginForm';

//A moldura (apresentação + centralização) vem de (auth)/layout.tsx.
//Quem já está logado é redirecionado antes de chegar aqui pelo proxy (src/proxy.ts)
export default function LoginPage() {
  const googleAuthEnabled = process.env.GOOGLE_AUTH_ENABLED === "true";
  return <LoginForm googleAuthEnabled={googleAuthEnabled} />;
}
