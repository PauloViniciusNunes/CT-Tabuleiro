import { z } from "zod";

export const OffensiveCardResponseValidator = z.object({
    battleId: z.string().min(1),
    defenderId: z.string().min(1),
    attribute: z.enum([
        "forca",
        "destreza",
        "consistencia",
        "inteligencia",
        "sabedoria",
        "carisma",
    ]),
    usedMana: z.number().int().nonnegative(),
    usedActions: z.number().int().positive(),
    usedCertaintyDie: z.boolean(),
    previewAction: z.boolean(),
});
