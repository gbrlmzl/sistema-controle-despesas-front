//Mesmo shape devolvido pela API em login/registro/refresh e em GET/PATCH /users/me.
export interface AuthUser {
    id: number;
    name: string;
    username: string | null;
    email: string;
    profilePic: string | null;
    //Só vem preenchido em GET /users/me — contas de login social (Google) não têm senha local.
    hasPassword?: boolean;
}
