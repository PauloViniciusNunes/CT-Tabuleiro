import { z } from "zod";

export const UseArtificeValidator = z.object({
    battleId: z.string().min(1),
    tokenId: z.string().min(1),
    itemId: z.string().min(1),
    itemIndex: z.number().int().min(0),
    target: z.unknown().optional(),
});
