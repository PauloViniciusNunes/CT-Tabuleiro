// Acrescente no seu arquivo Token
import type { ParalysisState } from './status';
import type {TokenEffect, TokenPrimaryElement, TokenPrimaryDisvantage} from './effects'
import type {Card } from './card';
import type { Item } from './item';

export interface TokenAttributes {
  forca: number;
  destreza: number;
  consistencia: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
  level: number;
  xp: number;
}

export interface TokenOccasionalAddition
{
  forca: number;
  destreza: number;
  consistencia: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
}

export interface TokenProficiencies {
  forca: boolean;
  destreza: boolean;
  consistencia: boolean;
  inteligencia: boolean;
  sabedoria: boolean;
  carisma: boolean;
}

export type InventoryDimensions ={
  rows: number;
  cols: number;
}

export interface TokenInventory {
  inventoryDimensions: InventoryDimensions;
  primaryHand?: Item | undefined;
  offHand?: Item | undefined;
  neck?: Item | undefined;
  ring?: Item | undefined;
  armor?: Item | undefined;
  commonSlot?: Item[];
  economy: number;
}

export type TokenStatus = "Vivo" | "Morto";
export type TokenTeam = "Red" | "Blue" | "Green" | "Yellow";
export type TokenClass = "Guerreiro" | "Mago" | "Bárbaro" | "Ladino" | "Feitiçeiro";

export interface TokenPosition {
  col: number;
  row: number;
}

export interface Token {
  id: string;
  name: string;
  imageUrl: string;
  attributes: TokenAttributes;
  ocassionalAddition: TokenOccasionalAddition;
  proficiencies: TokenProficiencies;
  class: TokenClass;
  cards: Card[]; // AQUI
  inventory: TokenInventory;
  status: TokenStatus;
  team: TokenTeam;
  position: TokenPosition;

  bodytobodyRange: number;      // Alcance de ataque físico (padrão: 1)
  magicalRange: number;          // Alcance de ataque mágico (padrão: 6)

  currentLife?: number;
  maxLife?: number;
  currentMana?: number;
  maxMana?: number;
  startPosition?: TokenPosition;
  certaintyDiceRemaining?: number;
  paralysisState?: ParalysisState;
  tokenEffects?: TokenEffect[]; // default: 'none'
  tokenPrimaryElement?: TokenPrimaryElement;
  tokenPrimaryDisvantege?: TokenPrimaryDisvantage;
  visualOverlays?: {
    id: string;
    type: string;
    size: number;
    offset: number;
    gifPath: string;
  }[];

}
