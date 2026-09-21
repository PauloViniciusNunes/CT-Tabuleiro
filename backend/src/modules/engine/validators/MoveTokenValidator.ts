import { z } from "zod";

/** Input accepted by the authoritative board-movement engine route. */
export const MoveTokenValidator = z.object({
    battleId: z.string().min(1),
    tokenId: z.string().min(1),
    to: z.object({
        col: z.number().int(),
        row: z.number().int(),
    }),
});
