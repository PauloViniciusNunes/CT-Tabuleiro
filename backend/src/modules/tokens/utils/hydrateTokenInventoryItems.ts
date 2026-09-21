import { ItemRepository } from "@/modules/items/repositories/ItemRepository";

interface TokenInventoryIds {
    readonly primaryHandId?: unknown;
    readonly offHandId?: unknown;
    readonly neckId?: unknown;
    readonly ringId?: unknown;
    readonly armorId?: unknown;
    readonly commonSlotIds?: unknown;
}

function inventoryItemIds(token: TokenInventoryIds): string[] {
    const equippedIds = [
        token.primaryHandId,
        token.offHandId,
        token.neckId,
        token.ringId,
        token.armorId,
    ].filter((id): id is string => typeof id === "string" && id.length > 0);
    const commonSlotIds = Array.isArray(token.commonSlotIds)
        ? token.commonSlotIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
        )
        : [];

    return [...new Set([...equippedIds, ...commonSlotIds])];
}

/** Adds the item records required to hydrate persisted inventory IDs. */
export async function hydrateTokenInventoryItems<T extends TokenInventoryIds>(
    tokens: readonly T[],
    itemRepository = new ItemRepository(),
) {
    const idsByToken = tokens.map(inventoryItemIds);
    const allItemIds = [...new Set(idsByToken.flat())];
    const items = await itemRepository.findManyByIds(allItemIds);
    const itemsById = new Map(items.map((item) => [item.id, item]));

    return tokens.map((token, index) => ({
        ...token,
        inventoryItems: idsByToken[index].flatMap((id) => {
            const item = itemsById.get(id);
            return item ? [item] : [];
        }),
    }));
}
