import { z } from "zod";

export const CreateCardValidator = z.object({

    name: z
        .string()
        .min(1)
        .max(100),

    desc: z
        .string()
        .min(1)
        .max(5000),

    img: z
        .string(),

    spellType: z
        .string()
        .optional(),

    spellCircle: z
        .number()
        .int()
        .min(0)
        .optional(),

    baseDice: z
        .unknown()
        .optional(),

    manaRequired: z
        .number()
        .int()
        .min(0)
        .optional(),

    actionsRequired: z
        .number()
        .int()
        .min(0)
        .optional(),

    duration: z
        .number()
        .int()
        .min(0)
        .optional(),

    recharge: z
        .number()
        .int()
        .min(0)
        .optional(),

    remainingDuration: z
        .number()
        .int()
        .min(0)
        .optional(),

    itsLoaded: z
        .boolean()
        .optional(),

    causality: z
        .string(),

    causalityType: z
        .string(),

    defenseReplicate: z
        .string()
        .optional(),

    partialOffensive: z
        .boolean()
        .optional(),

    entityQuantity: z
        .number()
        .int()
        .min(0)
        .optional(),

    effectToApply: z
        .unknown()
        .optional(),

    target: z
        .unknown(),
    token: z.unknown().optional(),
    tokenId: z.string().optional()
});