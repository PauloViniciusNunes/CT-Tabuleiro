import z from "zod";

export const CardChoiceValidator = z.object({
    battleId: z.string(),
    currentId: z.string(),
    target: z.unknown(),
    card: z.object({
        id: z.string().min(1),
    }).passthrough(),
    isArtifice: z.boolean(),
})
