import z from "zod";

export const UpdateCampaignMemberMapValidator = z.object({
    mapId: z.string().min(1),
    userIds: z.array(z.string().min(1)).min(1),
});
