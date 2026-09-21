import { z } from "zod";
import { ArtificeSettingsValidator } from "./ArtificeSettingsValidator";

export const CreateItemValidator = z.object({

    name: z
        .string()
        .min(1)
        .max(100),

    imgUrl: z
        .string(),

    desc: z
        .string()
        .min(1)
        .max(5000),

    slot: z
        .string(),

    ocasionalAdd: z
        .number()
        .int(),

    atributeToOcasionalAdd: z
        .string(),

    rarity: z
        .string(),

    value: z
        .number()
        .int()
        .min(0),

    craftable: z
        .boolean()
        .optional(),

    craftableWith: z
        .unknown()
        .optional(),

    isArtifice: z
        .boolean()
        .optional(),

    artficeSettings: ArtificeSettingsValidator,

    habilityCards: z
        .unknown()
        .optional(),

    passiveMechanics: z
        .array(z.string().min(1))
        .default([]),

    cardsIds: z
        .array(z.string())
        .default([]),

    vfxUrl: z
        .unknown()
        .optional(),

    sfxUrl: z
        .string()
        .optional(),

});
