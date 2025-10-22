export type TokenStatus = "Vivo" | "Morto";
export type TokenTeam = "Red" | "Blue" | "Green" | "Yellow";

// Slots de inventário
export interface TokenInventory {
  primaryHand?: string;   // ID ou nome do item de arma principal
  offHand?: string;       // ID ou nome do item de arma secundária
  neck?: string;          // ID ou nome do colar
  ring?: string;          // ID ou nome do anel
  armor?: string;         // ID ou nome da armadura
  economy: number;        // patrimônio do token
}

// Proficiências por atributo
export interface TokenProficiencies {
  forca: boolean;
  destreza: boolean;
  consistencia: boolean;
  inteligencia: boolean;
  sabedoria: boolean;
  carisma: boolean;
}

// Atributos básicos
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

// Modelo completo de Token
export interface Token {
  id: string;
  name: string;
  imageUrl: string;
  attributes: TokenAttributes;
  proficiencies: TokenProficiencies;
  inventory: TokenInventory;
  status: TokenStatus;
  team: TokenTeam;
  position: { col: number; row: number };
  // Campos de batalha, inicializados ao entrar em combate
  currentLife?: number;
  maxLife?: number;
  currentMana?: number;
  maxMana?: number;
  classMultipliers?: {
    life: number;
    mana: number;
  };
}
