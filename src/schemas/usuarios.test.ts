import { esqueciSenhaSchema, redefinirSenhaSchema, registerSchema, usernameSchema } from "./usuarios";

describe("usernameSchema", () => {
    it("aceita letras minúsculas, números e _", () => {
        expect(usernameSchema.safeParse("victor_25").success).toBe(true);
    });

    it("rejeita menos de 3 caracteres", () => {
        expect(usernameSchema.safeParse("ab").success).toBe(false);
    });

    it("rejeita mais de 20 caracteres", () => {
        expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
    });

    it("rejeita letras maiúsculas", () => {
        expect(usernameSchema.safeParse("Victor").success).toBe(false);
    });

    it("rejeita espaços e caracteres especiais", () => {
        expect(usernameSchema.safeParse("victor 25").success).toBe(false);
        expect(usernameSchema.safeParse("victor.25").success).toBe(false);
    });
});

function registroValido() {
    return {
        name: "Victor Salviano",
        username: "victor_25",
        email: "victor@example.com",
        password: "senha123",
        confirmPassword: "senha123",
    };
}

describe("registerSchema", () => {
    it("aceita um cadastro válido", () => {
        expect(registerSchema.safeParse(registroValido()).success).toBe(true);
    });

    it("rejeita email inválido", () => {
        const resultado = registerSchema.safeParse({ ...registroValido(), email: "não-é-email" });
        expect(resultado.success).toBe(false);
    });

    it("rejeita senha com menos de 8 caracteres", () => {
        const resultado = registerSchema.safeParse({
            ...registroValido(),
            password: "abc123",
            confirmPassword: "abc123",
        });
        expect(resultado.success).toBe(false);
    });

    it("rejeita senha sem dígito nem caractere não alfanumérico", () => {
        const resultado = registerSchema.safeParse({
            ...registroValido(),
            password: "somenteletras",
            confirmPassword: "somenteletras",
        });
        expect(resultado.success).toBe(false);
    });

    it("rejeita quando password e confirmPassword não coincidem, apontando o campo confirmPassword", () => {
        const resultado = registerSchema.safeParse({
            ...registroValido(),
            confirmPassword: "outrasenha1",
        });

        expect(resultado.success).toBe(false);
        if (!resultado.success) {
            expect(resultado.error.issues[0].path).toEqual(["confirmPassword"]);
        }
    });
});

describe("esqueciSenhaSchema", () => {
    it("aceita um email válido", () => {
        expect(esqueciSenhaSchema.safeParse({ email: "victor@example.com" }).success).toBe(true);
    });

    it("rejeita email inválido", () => {
        expect(esqueciSenhaSchema.safeParse({ email: "não-é-email" }).success).toBe(false);
    });
});

function redefinicaoValida() {
    return {
        token: "token-do-email",
        newPassword: "senha123",
        confirmNewPassword: "senha123",
    };
}

describe("redefinirSenhaSchema", () => {
    it("aceita uma redefinição válida", () => {
        expect(redefinirSenhaSchema.safeParse(redefinicaoValida()).success).toBe(true);
    });

    it("rejeita token vazio", () => {
        expect(redefinirSenhaSchema.safeParse({ ...redefinicaoValida(), token: "" }).success).toBe(false);
    });

    it("rejeita senha com menos de 8 caracteres", () => {
        const resultado = redefinirSenhaSchema.safeParse({
            ...redefinicaoValida(),
            newPassword: "abc123",
            confirmNewPassword: "abc123",
        });
        expect(resultado.success).toBe(false);
    });

    it("rejeita quando newPassword e confirmNewPassword não coincidem, apontando o campo confirmNewPassword", () => {
        const resultado = redefinirSenhaSchema.safeParse({
            ...redefinicaoValida(),
            confirmNewPassword: "outrasenha1",
        });

        expect(resultado.success).toBe(false);
        if (!resultado.success) {
            expect(resultado.error.issues[0].path).toEqual(["confirmNewPassword"]);
        }
    });
});
