import type { Card } from "../../types/card";
import type {
  Token,
  TokenAttributeMultipliers,
  TokenMultipliableAttribute,
  TokenTransformation,
} from "../../types/token";
import {
  normalizeMechanicDisadvantages,
  normalizePrimaryMechanics,
} from "../../utils/tokenMechanics";
import { CardMapper } from "./cardMapper";

export const MULTIPLIABLE_TOKEN_ATTRIBUTES: readonly TokenMultipliableAttribute[] = [
  "forca",
  "destreza",
  "consistencia",
  "inteligencia",
  "sabedoria",
  "carisma",
];

export const DEFAULT_TOKEN_ATTRIBUTE_MULTIPLIERS: TokenAttributeMultipliers = {
  forca: 1,
  destreza: 1,
  consistencia: 1,
  inteligencia: 1,
  sabedoria: 1,
  carisma: 1,
};

function mapCards(value: unknown): Card[] {
  return Array.isArray(value)
    ? value
        .filter((card): card is Record<string, unknown> => Boolean(card) && typeof card === "object")
        .map((card) => CardMapper(card))
    : [];
}

export function mapTokenAttributeMultipliers(value: unknown): TokenAttributeMultipliers {
  const source = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};

  return MULTIPLIABLE_TOKEN_ATTRIBUTES.reduce<TokenAttributeMultipliers>(
    (multipliers, attribute) => {
      const candidate = source[attribute];
      multipliers[attribute] = typeof candidate === "number" &&
        Number.isFinite(candidate) && candidate >= 0
        ? candidate
        : 1;
      return multipliers;
    },
    { ...DEFAULT_TOKEN_ATTRIBUTE_MULTIPLIERS },
  );
}

export function mapTokenTransformation(json: unknown): TokenTransformation | undefined {
  const source = json && typeof json === "object"
    ? json as Record<string, unknown>
    : {};

  if (source.isTransformation !== true || typeof source.baseTokenId !== "string" || !source.baseTokenId) {
    return undefined;
  }

  return {
    baseTokenId: source.baseTokenId,
    inheritBaseCards: source.inheritBaseCards !== false,
    attributeMultipliers: mapTokenAttributeMultipliers(source.attributeMultipliers),
    additionalCards: mapCards(source.additionalCards),
    additionalMechanics: normalizePrimaryMechanics(source.additionalMechanics),
    additionalDisadvantages: normalizeMechanicDisadvantages(source.additionalDisadvantages),
  };
}

export function jsonTokenTransformation(token: Token) {
  const transformation = token.transformation;

  return {
    isTransformation: Boolean(transformation),
    baseTokenId: transformation?.baseTokenId ?? null,
    inheritBaseCards: transformation?.inheritBaseCards ?? true,
    attributeMultipliers: transformation?.attributeMultipliers ?? {
      ...DEFAULT_TOKEN_ATTRIBUTE_MULTIPLIERS,
    },
    additionalCards: transformation?.additionalCards ?? [],
    additionalMechanics: transformation?.additionalMechanics ?? [],
    additionalDisadvantages: transformation?.additionalDisadvantages ?? [],
  };
}
