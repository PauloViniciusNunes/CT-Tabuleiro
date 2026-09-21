/**
 * Functions shared by inventory operations that derive a token's available
 * cards. `tokenCards` is the immutable, native repertoire; the cards granted
 * by the currently equipped items are added to it as a set.
 */
export type CardWithId = { id: string };

export type ItemWithCardIds = {
    cardsIds: readonly string[];
};

export const EQUIPPED_ITEM_ID_FIELDS = [
    "primaryHandId",
    "offHandId",
    "neckId",
    "ringId",
    "armorId",
] as const;

export type EquippedItemIdField =
    (typeof EQUIPPED_ITEM_ID_FIELDS)[number];

export const EQUIPPED_SLOT_TO_ITEM_ID_FIELD = {
    primaryHand: "primaryHandId",
    offHand: "offHandId",
    neck: "neckId",
    ring: "ringId",
    armor: "armorId",
} as const satisfies Record<string, EquippedItemIdField>;

export type EquippedInventorySlot =
    keyof typeof EQUIPPED_SLOT_TO_ITEM_ID_FIELD;

export const ITEM_SLOT_TO_EQUIPPED_FIELD = {
    "primary-hand": "primaryHandId",
    "off-hand": "offHandId",
    neck: "neckId",
    ring: "ringId",
    armor: "armorId",
} as const satisfies Record<string, EquippedItemIdField>;

export type EquippableItemSlot =
    keyof typeof ITEM_SLOT_TO_EQUIPPED_FIELD;

export function isEquippableItemSlot(
    slot: string,
): slot is EquippableItemSlot {
    return Object.hasOwn(ITEM_SLOT_TO_EQUIPPED_FIELD, slot);
}

/** Returns only well-formed card records from a persisted JSON value. */
export function cardsWithId(value: unknown): CardWithId[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(
        (card): card is CardWithId =>
            typeof card === "object" &&
            card !== null &&
            "id" in card &&
            typeof card.id === "string",
    );
}

export function uniqueIds(ids: readonly string[]): string[] {
    return [...new Set(ids.filter(Boolean))];
}

/**
 * Native cards always remain available. A card granted by more than one item
 * is included once, so unequipping one source cannot remove another source's
 * copy or create duplicates.
 */
export function computeInventoryCardIds(
    tokenCards: unknown,
    equippedItems: readonly ItemWithCardIds[],
): string[] {
    return uniqueIds([
        ...cardsWithId(tokenCards).map((card) => card.id),
        ...equippedItems.flatMap((item) => item.cardsIds),
    ]);
}

/**
 * Resolves an ordered, duplicate-free card list from the supplied sources.
 * Later sources intentionally win for the same id, matching the former
 * client-side inventory calculation.
 */
export function resolveCardsById(
    ids: readonly string[],
    sources: readonly (readonly CardWithId[])[],
): CardWithId[] {
    const cardsById = new Map<string, CardWithId>();

    for (const source of sources) {
        for (const card of source) {
            cardsById.set(card.id, card);
        }
    }

    return ids.flatMap((id) => {
        const card = cardsById.get(id);
        return card ? [card] : [];
    });
}
