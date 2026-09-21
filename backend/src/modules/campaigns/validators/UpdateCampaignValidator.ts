import { z } from "zod";

export const UpdateCampaignValidator = z.object({
    name: z
        .string()
        .min(3)
        .max(100)
        .optional(),

    description: z
        .string()
        .max(500)
        .optional(),
});