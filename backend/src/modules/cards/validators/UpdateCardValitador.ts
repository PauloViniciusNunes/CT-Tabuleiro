import { z } from "zod";

export const UpdateCardValidator = z.object({

    name: z
        .string()
        .min(1)
        .max(100)
        .optional(),

    desc: z
        .string()
        .min(1)
        .max(5000)
        .optional(),

    img: z
        .string()
        .optional(),

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
        .string()
        .optional(),

    causalityType: z
        .string()
        .optional(),

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
        .unknown()
        .optional(),

});