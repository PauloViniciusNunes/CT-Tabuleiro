import { z } from "zod";

const PivotSettingsValidator = z.object({
    areaImgUrl: z.string(),
    pivotType: z.enum(["Trigger-Fix", "Cell-Fix", "Token-Fix"]),
    range: z.number(),
});

const CardTargetValidator = z.object({
    type: z.enum(["Self", "Target", "Multi-Target", "Ambient"]),
    pivot: z.array(z.number()).nullable().optional(),
    pivotSettings: PivotSettingsValidator.nullable().optional(),
    numbersTarget: z.number().int().nullable().optional(),
});

/** Validates the persisted fields consumed by the battle engine. */
export const EngineCardValidator = z.object({
    id: z.string(),
    baseDice: z.object({
        quantity: z.number().int().nonnegative(),
        type: z.string(),
    }).nullable().optional(),
    manaRequired: z.number().int().nonnegative().nullable().transform((value) => value ?? 0),
    actionsRequired: z.number().int().nonnegative().nullable().transform((value) => value ?? 0),
    duration: z.number().int().nonnegative().nullable().transform((value) => value ?? 1),
    recharge: z.number().int().nonnegative(),
    causalityType: z.string(),
    defenseReplicate: z.string().nullable().optional(),
    partialOffensive: z.boolean().nullable().optional(),
    entityQuantity: z.number().int().nonnegative(),
    effectToApply: z.array(z.string()).default([]),
    target: CardTargetValidator,
}).passthrough();
