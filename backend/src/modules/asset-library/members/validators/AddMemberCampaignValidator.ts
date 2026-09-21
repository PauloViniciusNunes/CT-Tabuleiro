import z from "zod";

export const AddMemberCampaignValidator = z.object({
    campaignId: z.string(),
    userId: z.string()
})