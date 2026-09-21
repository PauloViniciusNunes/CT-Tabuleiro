import type { Card } from "../../types/card";
import type {
  BossInterfaceColors,
  Token,
  TokenAttributes,
  TokenClass,
  TokenInventory,
  TokenTransformation,
  TokenProficiencies,
  TokenStatus,
  TokenTeam,
  TokenType,
} from "../../types/token";
import type { PrimaryMechanic, TokenPrimaryDisvantage } from "../../types/effects";
import { generateUUID } from "../../utils/generateUUID";

export interface TokenFormModel {
  existing?: Token;
  name: string;
  type: TokenType;
  imageUrl: string;
  attributes: TokenAttributes;
  proficiencies: TokenProficiencies;
  inventory: TokenInventory;
  status: TokenStatus;
  team: TokenTeam;
  tokenClass: TokenClass;
  cards: Card[];
  bodyToBodyRange: number;
  naturalMovement: number;
  magicalRange: number;
  primaryElements: PrimaryMechanic[];
  primaryDisadvantages: TokenPrimaryDisvantage[];
  bossSettings?: BossInterfaceColors;
  ownerId: string;
  campaignId: string;
  transformation?: TokenTransformation;
  baseToken?: Token;
}

const EMPTY_ADDITION = {
  forca: 0,
  destreza: 0,
  consistencia: 0,
  inteligencia: 0,
  sabedoria: 0,
  carisma: 0,
} as const;

/** Single domain model used by both Token Create and Token Edit forms. */
export function tokenFromForm(model: TokenFormModel): Token {
  const existing = model.existing;
  const id = existing?.id ?? generateUUID();
  const transformation = model.transformation;
  const baseToken = model.baseToken;
  const cards = transformation
    ? mergeById(
        transformation.inheritBaseCards ? (baseToken?.cards ?? []) : [],
        transformation.additionalCards,
      )
    : model.cards;
  const mechanics = transformation
    ? mergeStrings(
        baseToken?.tokenPrimaryElement ?? [],
        transformation.additionalMechanics,
        "neutro",
      )
    : model.primaryElements;
  const disadvantages = transformation
    ? mergeStrings(
        baseToken?.tokenPrimaryDisvantege ?? [],
        transformation.additionalDisadvantages,
        "none",
      )
    : model.primaryDisadvantages;
  const inventory = transformation && baseToken
    ? baseToken.inventory
    : model.inventory;

  return {
    ...existing,
    id,
    createId: existing?.createId ?? id,
    lastDamagerId: existing?.lastDamagerId,
    name: model.name.trim(),
    type: model.type,
    imageUrl: model.imageUrl,
    attributes: { ...model.attributes },
    ocassionalAddition: {
      ...(existing?.ocassionalAddition ?? EMPTY_ADDITION),
    },
    proficiencies: { ...model.proficiencies },
    class: model.tokenClass,
    tokenCards: [...cards],
    cards: [...cards],
    inventory: {
      ...inventory,
      inventoryDimensions: { ...inventory.inventoryDimensions },
      commonSlot: [...(inventory.commonSlot ?? [])],
    },
    status: model.status,
    team: model.team,
    position: existing?.position ?? { col: 0, row: 0 },
    startPosition: existing?.startPosition,
    bodytobodyRange: Math.max(1, Math.floor(model.bodyToBodyRange)),
    magicalRange: Math.max(1, Math.floor(model.magicalRange)),
    naturalMovement: Math.max(0, Math.floor(model.naturalMovement)),
    pendingXPAllocating: existing?.pendingXPAllocating ?? 0,
    currentLife: existing?.currentLife ?? 1,
    maxLife: existing?.maxLife ?? 1,
    currentMana: existing?.currentMana ?? 0,
    maxMana: existing?.maxMana ?? 0,
    certaintyDiceRemaining: existing?.certaintyDiceRemaining ?? 0,
    paralysisState: existing?.paralysisState ?? "none",
    tokenEffects: existing?.tokenEffects ?? [],
    tokenPrimaryElement: [...mechanics],
    tokenPrimaryDisvantege: [...disadvantages],
    visualOverlays: existing?.visualOverlays ?? [],
    bossSettings: model.type === "boss" ? model.bossSettings : undefined,
    ownerId: model.ownerId,
    campaignId: model.campaignId,
    transformation,
  };
}

function mergeById<T extends { id: string }>(left: readonly T[], right: readonly T[]): T[] {
  return [...new Map([...left, ...right].map((value) => [value.id, value])).values()];
}

function mergeStrings<T extends string>(
  left: readonly T[],
  right: readonly T[],
  emptyValue: T,
): T[] {
  const merged = [...new Set([...left, ...right])];
  const meaningful = merged.filter((value) => value !== emptyValue);
  return meaningful.length > 0 ? meaningful : [emptyValue];
}
