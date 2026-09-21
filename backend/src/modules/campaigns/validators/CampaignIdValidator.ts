import { z } from "zod"

export const CampaignIdValidator = z.object({
    id: z
        .string()
        .min(8, "Id não inserido")
})