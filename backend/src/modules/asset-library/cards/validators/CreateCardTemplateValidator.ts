import z from "zod";

export const CreateTokenCardValidator = z.object({
    tokenId: z.string(),
    cardId: z.string(),
})