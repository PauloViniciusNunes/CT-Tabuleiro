import { z } from "zod";

export const LoginValidator = z.object({
    email: z
        .email("E-mail inválido")
        .trim()
        .toLowerCase(),

    password: z
        .string()
        .min(1, "Senha obrigatória"),
});

export type LoginInput =
    z.infer<typeof LoginValidator>;