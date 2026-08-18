import { Suspense } from 'react';
import RedefinirSenhaForm from './RedefinirSenhaForm';

//A moldura (apresentação + centralização) vem de (auth)/layout.tsx. Esta rota não
//entra no proxy (src/proxy.ts) — precisa funcionar mesmo com sessão ativa (F-03).
//
//O <Suspense> é obrigatório: RedefinirSenhaForm usa useSearchParams() (F-06), que tira
//a rota da geração estática, e o next build falha sem um Suspense acima dele.
export default function RedefinirSenhaPage() {
    return (
        <Suspense fallback={<p>Verificando o link...</p>}>
            <RedefinirSenhaForm />
        </Suspense>
    );
}
