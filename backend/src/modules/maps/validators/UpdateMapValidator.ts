import { z } from "zod";

export const UpdateMapValidator = z.object({

    name: z
        .string()
        .min(3)
        .max(100)
        .optional(),

    description: z
        .string()
        .max(500)
        .optional(),

    img: z.string().optional(),

    rows: z
        .number()
        .int()
        .min(1)
        .optional(),

    cols: z
        .number()
        .int()
        .min(1)
        .optional()
});