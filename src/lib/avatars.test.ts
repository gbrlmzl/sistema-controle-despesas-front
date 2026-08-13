import { AVATARS, isValidAvatar } from "./avatars";

describe("isValidAvatar", () => {
    it("aceita qualquer caminho presente na lista de avatares", () => {
        for (const avatar of AVATARS) {
            expect(isValidAvatar(avatar)).toBe(true);
        }
    });

    it("rejeita um caminho fora da whitelist", () => {
        expect(isValidAvatar("/avatars/avatar-99.svg")).toBe(false);
    });

    it("rejeita um caminho arbitrário injetado por um cliente malicioso", () => {
        expect(isValidAvatar("https://evil.example/avatar.svg")).toBe(false);
        expect(isValidAvatar("../../etc/passwd")).toBe(false);
    });
});
