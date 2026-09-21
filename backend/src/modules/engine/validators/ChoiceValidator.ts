import z from "zod";

export const ChoiceValidator = z.object({
    attribute: z.string().optional(),
    type: z.string(),
    targetId: z.string().nullable().optional(),
    selectedMechanic: z.string().optional(),
}).loose()
