/** Base occasional Strength addition granted by IMACULADA. */
export const INITIAL_ACCUMULATED_STRENGTH_BONUS = 0;

/**
 * Reads a persisted IMACULADA bonus defensively. A value of zero only exists
 * in instances created before the mechanic received its 50-point base, so it
 * is treated as the legacy initial state rather than an earned value.
 */
export function getAccumulatedStrengthBonus(
    metadata: Readonly<Record<string, unknown>>,
): number {
    const value = metadata.accumulatedStrengthBonus;

    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : INITIAL_ACCUMULATED_STRENGTH_BONUS;
}
