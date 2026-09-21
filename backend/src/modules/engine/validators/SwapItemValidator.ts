import { z } from "zod";

const tokenId = z.string().min(1);

export const SwapItemValidator = z.discriminatedUnion("operation", [
    z.object({
        operation: z.literal("equip"),
        tokenId,
        itemId: z.string().min(1),
        itemIndex: z.number().int().nonnegative(),
    }),
    z.object({
        operation: z.literal("unequip"),
        tokenId,
        equippedSlot: z.enum([
            "primaryHand",
            "offHand",
            "neck",
            "ring",
            "armor",
        ]),
    }),
]);
