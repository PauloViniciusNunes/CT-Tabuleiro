import type { Item } from "../../types/item";
import type { TokenInventory } from "../../types/token";

type PersistedInventory = {
  inventoryDimensionsRows?: unknown;
  inventoryDimensionsCols?: unknown;
  primaryHandId?: unknown;
  offHandId?: unknown;
  neckId?: unknown;
  ringId?: unknown;
  armorId?: unknown;
  commonSlotIds?: unknown;
  economy?: unknown;
};

export function findItemById(
  id: unknown,
  items: readonly Item[],
): Item | undefined {
  if (typeof id !== "string" || id.length === 0) {
    return undefined;
  }

  return items.find((item) => item.id === id);
}

/** Returns every resolved item currently retained by the UI inventory. */
export function inventoryItems(inventory: TokenInventory): Item[] {
  const equippedItems = [
    inventory.primaryHand,
    inventory.offHand,
    inventory.neck,
    inventory.ring,
    inventory.armor,
  ].filter((item): item is Item => item !== undefined);

  return [...new Map(
    [...equippedItems, ...(inventory.commonSlot ?? [])]
      .map((item) => [item.id, item]),
  ).values()];
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/** Hydrates persisted item IDs into the Item objects expected by the UI. */
export function mapInventoryIdsToItems(
  inventory: PersistedInventory,
  items: readonly Item[],
): TokenInventory {
  const commonSlotIds = Array.isArray(inventory.commonSlotIds)
    ? inventory.commonSlotIds
    : [];

  return {
    inventoryDimensions: {
      rows: numberOr(inventory.inventoryDimensionsRows, 0),
      cols: numberOr(inventory.inventoryDimensionsCols, 0),
    },
    primaryHand: findItemById(inventory.primaryHandId, items),
    offHand: findItemById(inventory.offHandId, items),
    neck: findItemById(inventory.neckId, items),
    ring: findItemById(inventory.ringId, items),
    armor: findItemById(inventory.armorId, items),
    commonSlot: commonSlotIds.flatMap((id) => {
      const item = findItemById(id, items);
      return item ? [item] : [];
    }),
    economy: numberOr(inventory.economy, 0),
  };
}

/** Serializes the UI inventory back to the IDs stored by the database. */
export function mapInventoryItemsToIds(inventory: TokenInventory) {
  return {
    inventoryDimensionsCols: inventory.inventoryDimensions.cols,
    inventoryDimensionsRows: inventory.inventoryDimensions.rows,
    primaryHandId: inventory.primaryHand?.id ?? "",
    offHandId: inventory.offHand?.id ?? "",
    neckId: inventory.neck?.id ?? "",
    ringId: inventory.ring?.id ?? "",
    armorId: inventory.armor?.id ?? "",
    commonSlotIds: (inventory.commonSlot ?? []).map((item) => item.id),
    economy: inventory.economy,
  };
}
