// UpdateTokenTemplateValidator.ts

import { z } from "zod";

import {
    tokenClassSchema,
    tokenTypeSchema,
} from "@/modules/tokens/validators/TokenSharedValidator";

export const UpdateTokenTemplateValidator = z.object({
    name: z
        .string()
        .min(1)
        .max(120)
        .optional(),

    imageUrl: z
        .string()
        .min(1)
        .optional(),

    type: tokenTypeSchema.optional(),

    col: z.number().int(),
    row: z.number().int(),

    class: tokenClassSchema.optional(),
});