import * as z from "zod";

//Identificador público do usuário (FEAT-003). É por ele que um usuário
//convida outro para uma residência, sem precisar expor o email.
export const usernameSchema = z.string()
    .min(3, "O nome de usuário deve ter no mínimo 3 caracteres")
    .max(20, "O nome de usuário deve ter no máximo 20 caracteres")
    .regex(/^[a-z0-9_]+$/, "O nome de usuário aceita apenas letras minúsculas, números e _");

//Regra de senha compartilhada por cadastro e redefinição (docs/plano-recuperacao-de-senha-frontend.md).
//Extraída aqui pra não virar uma terceira cópia da mesma regra.
export const senhaSchema = z.string().min(8, "A senha deve ter no mínimo 8 caracteres").max(100).refine(p => /[\d\W]/.test(p));

export const registerSchema = z.object({
    name: z.string().min(1, "O nome não pode estar vazio").max(100),
    username: usernameSchema,
    email: z.email('Email inválido'),
    password: senhaSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
}).refine(data => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não coincidem',
});

//A API responde 200 mesmo para email inexistente (anti-enumeração) — o único erro
//validável no client é formato de email, pra evitar um 400 inútil de ida e volta.
export const esqueciSenhaSchema = z.object({
  email: z.email('Email inválido'),
});

//O token viaja no corpo (nunca na URL) e é sempre uma string opaca vinda do link do
//email — sem formato próprio pra validar além de "não estar vazio".
export const redefinirSenhaSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
  newPassword: senhaSchema,
  confirmNewPassword: z.string().min(1, 'Confirme a senha'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  path: ['confirmNewPassword'],
  message: 'As senhas não coincidem',
});

