import { z } from "zod";

export const CreateCampaignValidator = z.object({
    name: z
        .string()
        .trim()
        .min(3)
        .max(100),

    description: z
        .string()
        .trim()
        .max(1000)
        .optional(),
});