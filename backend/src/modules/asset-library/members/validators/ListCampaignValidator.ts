import z from "zod";

export const ListCampaignValidator = z.object({
    userId: z.string()
})