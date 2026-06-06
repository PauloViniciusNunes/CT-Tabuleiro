import type { Token, TokenInventory } from "../types/token";
import type { Item, ItemSlot } from "../types/item";
import { computeTokenCardsWithSets } from "./inventoryEquipment";


export function swapItemInInventory(
    item: Item,
    itemIndex: number,
    tokenId: string,
    setBoardTokens: React.Dispatch<React.SetStateAction<Token[]>>
) {
    if (item.slot === "inventory-only") return;

    type EquippedSlot =
        keyof Pick<
            TokenInventory,
            "primaryHand" | "offHand" | "neck" | "ring" | "armor"
        >;

    type EquippableItemSlot = Exclude<ItemSlot, "inventory-only">;

    const slotMap: Record<EquippableItemSlot, EquippedSlot> = {
        "primary-hand": "primaryHand",
        "off-hand": "offHand",
        neck: "neck",
        ring: "ring",
        armor: "armor",
    };

    const targetSlot = slotMap[item.slot];

    setBoardTokens(prev =>
        prev.map(t => {
            if (t.id !== tokenId) return t;

            const inventory = t.inventory;
            const currentItems = inventory.commonSlot ?? [];

            const removedItem = inventory[targetSlot];

            const newCommonSlot = currentItems.filter((_, i) => i !== itemIndex);

            if (removedItem) newCommonSlot.push(removedItem);

            const updatedToken: Token = {
                ...t,
                inventory: {
                    ...inventory,
                    [targetSlot]: item,
                    commonSlot: newCommonSlot,
                },
            };

            const newCards = computeTokenCardsWithSets(
                updatedToken,
                removedItem,
                item
            );

            return {
                ...updatedToken,
                cards: newCards,
            };
        })
    );
}