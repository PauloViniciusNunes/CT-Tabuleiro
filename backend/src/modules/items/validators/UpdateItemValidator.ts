import { z } from "zod";
import { ArtificeSettingsValidator } from "./ArtificeSettingsValidator";

export const UpdateItemValidator = z.object({

    name: z
        .string()
        .min(1)
        .max(100)
        .optional(),

    imgUrl: z
        .string()
        .optional(),

    desc: z
        .string()
        .min(1)
        .max(5000)
        .optional(),

    slot: z
        .string()
        .optional(),

    ocasionalAdd: z
        .number()
        .int()
        .optional(),

    atributeToOcasionalAdd: z
        .string()
        .optional(),

    rarity: z
        .string()
        .optional(),

    value: z
        .number()
        .int()
        .min(0)
        .optional(),

    craftable: z
        .boolean()
        .optional(),

    craftableWith: z
        .unknown()
        .optional(),

    isArtifice: z
        .boolean()
        .optional(),

    artficeSettings: ArtificeSettingsValidator.optional(),

    habilityCards: z
        .unknown()
        .optional(),

    passiveMechanics: z
        .array(z.string().min(1))
        .optional(),

    cardsIds: z
        .array(z.string())
        .optional(),

    vfxUrl: z
        .unknown()
        .optional(),

    sfxUrl: z
        .string()
        .optional(),

});
