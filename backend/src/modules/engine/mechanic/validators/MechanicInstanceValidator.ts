import z from "zod";

export const MechanicInstanceValidator = z.object({
    id: z.string(),
    definition: z.unknown(),
    sourceTokenId: z.string(),
    intensity: z.number().int(),
    duration: z.number().int().optional(),
    metadata: z.unknown().optional(),
})