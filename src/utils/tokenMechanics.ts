import {
  TokenPrimaryElement,
  type PrimaryMechanic,
  type TokenPrimaryDisvantage,
} from "../types/effects";

const primaryMechanics = new Set<string>(TokenPrimaryElement);

function valuesFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

export function normalizePrimaryMechanics(value: unknown): PrimaryMechanic[] {
  return [...new Set(
    valuesFromUnknown(value).filter(
      (entry): entry is PrimaryMechanic =>
        typeof entry === "string" && primaryMechanics.has(entry),
    ),
  )];
}

export function normalizeMechanicDisadvantages(value: unknown): TokenPrimaryDisvantage[] {
  return [...new Set(
    valuesFromUnknown(value).filter(
      (entry): entry is TokenPrimaryDisvantage =>
        entry === "none" || (typeof entry === "string" && primaryMechanics.has(entry)),
    ),
  )];
}

export function getTokenMechanicForAction(
  mechanics: readonly PrimaryMechanic[] | undefined,
  selectedMechanic: PrimaryMechanic | undefined,
  usedMana: number,
): PrimaryMechanic {
  if (usedMana <= 0) return "neutro";

  const available: readonly PrimaryMechanic[] = mechanics?.length
    ? mechanics
    : ["neutro"];
  if (available.length === 1) return available[0];
  return selectedMechanic && available.includes(selectedMechanic)
    ? selectedMechanic
    : available[0];
}

export function hasMechanicDisadvantage(
  disadvantages: readonly TokenPrimaryDisvantage[] | undefined,
  mechanic: PrimaryMechanic,
): boolean {
  return disadvantages?.includes(mechanic) ?? false;
}
