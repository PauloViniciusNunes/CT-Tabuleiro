import { z } from "zod";

/**
 * Persisted configuration for a finite, usable inventory item.
 * `effectToApply` remains accepted only so existing records can still be read.
 */
export const ArtificeSettingsValidator = z.object({
    lifeAdd: z.number().finite().int().default(0),
    manaAdd: z.number().finite().int().default(0),
    mechanicToApply: z.string().min(1).nullable().optional(),
    effectToApply: z.string().min(1).nullable().optional(),
    cardDispachId: z.string().min(1).nullable().optional(),
}).passthrough();

export type ArtificeSettingsInput = z.infer<typeof ArtificeSettingsValidator>;
