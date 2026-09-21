import z from "zod";

export const ListMemberValidator = z.object({
    campaignId: z.string()
})