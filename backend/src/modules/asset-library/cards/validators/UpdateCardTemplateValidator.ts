import z from "zod";

export const UpdateTokenCardValidator = z.object({
    id: z.string().cuid().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    remainingDuration: z.number().int().optional(),
    itsLoaded: z.boolean().optional(),
    remainingRecharge: z.number().int().optional(),
    tokenId: z.string().optional(),
    cardId: z.string().optional(),
    token: z.unknown().optional(),
    card: z.unknown().optional()
})