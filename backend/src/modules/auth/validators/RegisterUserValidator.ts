import { z } from "zod";

export const RegisterUserValidator = z.object({
    name: z
        .string()
        .trim()
        .min(3, "Nome muito curto")
        .max(50, "Nome muito longo"),

    email: z
        .email("E-mail inválido")
        .trim()
        .toLowerCase(),

    password: z
        .string()
        .min(8, "A senha deve possuir pelo menos 8 caracteres")
        .max(100),
});

export type RegisterUserInput =
    z.infer<typeof RegisterUserValidator>;