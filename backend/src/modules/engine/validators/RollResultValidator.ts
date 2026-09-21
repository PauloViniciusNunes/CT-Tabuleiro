import z from "zod";

export const RollResultValidator = z.object({
    rawRolls: z.array(z.number()),
    total: z.number().int(),
    usedMana: z.number().int(),
    CRI: z.number().int(),
    // adicione os demais campos do RollResult aqui
}).loose()