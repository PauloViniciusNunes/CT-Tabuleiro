/**
 * A card duration is optional. Zero, null or an absent value means that the
 * mechanic keeps its own defaultDuration; a positive integer is an explicit
 * override supplied by the card.
 */
export function cardDurationOverride(cardDuration: unknown): Record<string, number> {
  if (
    typeof cardDuration !== "number" ||
    !Number.isInteger(cardDuration) ||
    cardDuration <= 0
  ) {
    return {};
  }

  return { duration: cardDuration };
}
