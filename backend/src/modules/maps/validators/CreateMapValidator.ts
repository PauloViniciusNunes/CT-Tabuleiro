import { z } from "zod";

export const CreateMapValidator = z.object({

    name: z
        .string()
        .min(3)
        .max(100),

    description: z
        .string()
        .max(500)
        .optional(),

    campaignId: z
        .string()
        .cuid(),
    
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