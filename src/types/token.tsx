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

export interface TokenProficiencies {
  forca: boolean;
  destreza: boolean;
  consistencia: boolean;
  inteligencia: boolean;
  sabedoria: boolean;
  carisma: boolean;
}

export interface TokenInventory {
  primaryHand?: string;
  offHand?: string;
  neck?: string;
  ring?: string;
  armor?: string;
  economy: number;
}

export type TokenStatus = "Vivo" | "Morto";
export type TokenTeam = "Red" | "Blue" | "Green" | "Yellow";

export interface TokenPosition {
  col: number;
  row: number;
}

export interface Token {
  id: string;
  name: string;
  imageUrl: string;
  attributes: TokenAttributes;
  proficiencies: TokenProficiencies;
  inventory: TokenInventory;
  status: TokenStatus;
  team: TokenTeam;
  position: TokenPosition;
  currentLife?: number;
  maxLife?: number;
  currentMana?: number;
  maxMana?: number;
  startPosition?: TokenPosition;
}
