import z from "zod";

export const RemoveMemberCampaignValidator = z.object({
    campaignId: z.string(),
    userId: z.string()
})