/**
 * Extracts the identity of the item selected for an action without coupling
 * roll construction to the complete transport shape of an Item.
 */
export function getUsedItemId(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }

    const itemId = (value as Record<string, unknown>).id;

    return typeof itemId === "string" && itemId.trim()
        ? itemId.trim()
        : undefined;
}
