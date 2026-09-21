import type { Token, TokenType, TokenClass, TokenStatus, TokenTeam } from '../../types/token'; // Ajuste o caminho do import conforme seu projeto
import type { Card } from '../../types/card';
import type { Item } from '../../types/item';
import { CardMapper } from './cardMapper';
import { ItemMapper } from './itemMapper';
import { mapInventoryIdsToItems } from "./tokenInventoryMapper";
import {
  normalizeMechanicDisadvantages,
  normalizePrimaryMechanics,
} from "../../utils/tokenMechanics";
import { mapTokenTransformation } from "./tokenTransformationMapper";

export function TokenInstaceMapper(
  json: any,
  cards: Card[] = [],
  items: Item[] = [],
): Token {

  const safeItems = Array.isArray(items) ? items : [];
  const inventoryItems = Array.isArray(json.inventoryItems)
    ? json.inventoryItems.map((item: unknown) => ItemMapper(item, cards))
    : [];
  const availableItems = [...inventoryItems, ...safeItems];

  return {
    id: json.id,
    createId: json.templateTokenId ?? json.createId ?? json.id,
    lastDamagerId: json.lastDamagerId ?? undefined,
    name: json.name,
    type: json.type as TokenType,
    imageUrl: json.imageUrl,
    class: json.class as TokenClass,
    status: json.status as TokenStatus,
    team: json.team as TokenTeam,

    bodytobodyRange: json.bodyToBodyRange,
    magicalRange: json.magicalRange,
    naturalMovement: json.naturalMovement ?? 6,
    pendingXPAllocating: json.pendingXPAllocating,

    currentLife: json.currentLife ?? undefined,
    maxLife: json.maxLife ?? undefined,
    currentMana: json.currentMana ?? undefined,
    maxMana: json.maxMana ?? undefined,

    certaintyDiceRemaining: json.certaintyDiceRemaining ?? undefined,
    paralysisState: json.paralysisState ?? undefined,
    tokenPrimaryElement: normalizePrimaryMechanics(json.tokenPrimaryElement),
    tokenPrimaryDisvantege: normalizeMechanicDisadvantages(json.tokenPrimaryDisvantage),
    bossSettings: json.bossSettings ?? undefined,

    position: {
      col: json.col,
      row: json.row,
    },

    startPosition: json.startCol !== null && json.startRow !== null
      ? { col: json.startCol, row: json.startRow }
      : undefined,

    attributes: {
      forca: json.forca,
      destreza: json.destreza,
      consistencia: json.consistencia,
      inteligencia: json.inteligencia,
      sabedoria: json.sabedoria,
      carisma: json.carisma,
      level: json.level,
      xp: json.xp,
    },

    ocassionalAddition: {
      forca: json.bonusForca,
      destreza: json.bonusDestreza,
      consistencia: json.bonusConsistencia,
      inteligencia: json.bonusInteligencia,
      sabedoria: json.bonusSabedoria,
      carisma: json.bonusCarisma,
    },

    proficiencies: {
      forca: json.profForca,
      destreza: json.profDestreza,
      consistencia: json.profConsistencia,
      inteligencia: json.profInteligencia,
      sabedoria: json.profSabedoria,
      carisma: json.profCarisma,
    },

    // 🟢 Proteção contra arrays indefinidos/nulos
    tokenCards: Array.isArray(json.tokenCards) ? json.tokenCards.map((c: any) => CardMapper(c)) : [],
    cards: Array.isArray(json.cards) ? json.cards.map((c: any) => CardMapper(c)) : [],

    inventory: mapInventoryIdsToItems(json, availableItems),

    tokenEffects: Array.isArray(json.tokenEffects) ? json.tokenEffects : [],
    visualOverlays: Array.isArray(json.visualOverlays) ? json.visualOverlays : [],
    ownerId: json.userId,
    campaignId: json.campaignId ?? json.map?.campaignId ?? "",
    transformation: mapTokenTransformation(json),
  };
}

export function JsonTokenIntanceMapper(token: Token, mapId: string): any {
  return {
    tokenId: token.createId,
    mapId: mapId,
    col: token.position.col,
    row: token.position.row
  };
}
