import type { Token, TokenType, TokenClass, TokenStatus, TokenTeam } from '../../types/token'; // Ajuste o caminho do import conforme seu projeto
import type { Card } from '../../types/card';
import type { Item } from '../../types/item';
import { ItemMapper } from "./itemMapper";
import {
  mapInventoryIdsToItems,
  mapInventoryItemsToIds,
} from "./tokenInventoryMapper";
import {
  normalizeMechanicDisadvantages,
  normalizePrimaryMechanics,
} from "../../utils/tokenMechanics";
import { jsonTokenTransformation, mapTokenTransformation } from "./tokenTransformationMapper";
import { CardMapper } from "./cardMapper";

function mapCards(value: unknown): Card[] {
  return Array.isArray(value) ? value.map((card) => CardMapper(card)) : [];
}

export function TokenMapper(json: any, cards: Card[], items: Item[]): Token {
  const inventoryItems = Array.isArray(json.inventoryItems)
    ? json.inventoryItems.map((itemJson: any) => ItemMapper(itemJson, cards))
    : [];
  // Embedded records are authoritative for the IDs returned with this token.
  const availableItems = [...inventoryItems, ...items];

  return {
    id: json.id,
    createId: json.id,
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

    // Campos de instâncias de itens e cards inicializados vazios conforme solicitado
    tokenCards: mapCards(json.tokenCards),
    cards: mapCards(json.cards),
    
    inventory: mapInventoryIdsToItems(json, availableItems),

    // Tratamento adaptativo para campos JSON estruturados
    tokenEffects: Array.isArray(json.tokenEffects) ? json.tokenEffects : [],
    visualOverlays: Array.isArray(json.visualOverlays) ? json.visualOverlays : [],
    ownerId: json.userId,
    campaignId: json.campaignId,
    transformation: mapTokenTransformation(json),
  };
}

export function JsonTokenMapper(token: Token): any {
  const inventory = mapInventoryItemsToIds(token.inventory);

  return {
    id: token.id,
    lastDamagerId: token.lastDamagerId ?? null,
    name: token.name,
    type: token.type,
    imageUrl: token.imageUrl,
    class: token.class,
    status: token.status,
    team: token.team,
    
    // ===== Position =====

    position: {
      col: token.position.col,
      row: token.position.row,
    },

    startCol: token.startPosition?.col ?? 0,
    startRow: token.startPosition?.row ?? 0,


    // ===== Inventory =====
    ...inventory,
    ...jsonTokenTransformation(token),

    // ===== Attributes =====
    forca: token.attributes.forca,
    destreza: token.attributes.destreza,
    consistencia: token.attributes.consistencia,
    inteligencia: token.attributes.inteligencia,
    sabedoria: token.attributes.sabedoria,
    carisma: token.attributes.carisma,
    level: token.attributes.level,
    xp: token.attributes.xp,

    // ===== Occasional Addition =====
    bonusForca: token.ocassionalAddition.forca,
    bonusDestreza: token.ocassionalAddition.destreza,
    bonusConsistencia: token.ocassionalAddition.consistencia,
    bonusInteligencia: token.ocassionalAddition.inteligencia,
    bonusSabedoria: token.ocassionalAddition.sabedoria,
    bonusCarisma: token.ocassionalAddition.carisma,

    // ===== Proficiencies =====
    profForca: token.proficiencies.forca,
    profDestreza: token.proficiencies.destreza,
    profConsistencia: token.proficiencies.consistencia,
    profInteligencia: token.proficiencies.inteligencia,
    profSabedoria: token.proficiencies.sabedoria,
    profCarisma: token.proficiencies.carisma,

    // ===== Combat & Vitals =====
    bodyToBodyRange: token.bodytobodyRange,
    magicalRange: token.magicalRange,
    naturalMovement: token.naturalMovement ?? 6,
    pendingXPAllocating: token.pendingXPAllocating,
    currentLife: token.currentLife ?? null,
    maxLife: token.maxLife ?? null,
    currentMana: token.currentMana ?? null,
    maxMana: token.maxMana ?? null,

    // ===== States & Optionals =====
    certaintyDiceRemaining: token.certaintyDiceRemaining ?? null,
    paralysisState: token.paralysisState ?? null,
    tokenPrimaryElement: token.tokenPrimaryElement ?? [],
    tokenPrimaryDisvantage: token.tokenPrimaryDisvantege ?? [],
    bossSettings: token.bossSettings ?? null,

    // ===== JSON Fields & Arrays =====
    tokenCards: token.tokenCards,
    cards: token.cards,
    tokenEffects: token.tokenEffects ?? [],
    visualOverlays: token.visualOverlays ?? [],
    
    userId: token.ownerId,
    campaignId: token.campaignId,

    // Timestamps opcionais (caso precise enviar no payload, senão o Prisma gera só no banco)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
