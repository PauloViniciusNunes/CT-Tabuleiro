import { z } from "zod";

export const CampaignIdValidator = z.object({
    campaignId: z.string().min(1)
})
