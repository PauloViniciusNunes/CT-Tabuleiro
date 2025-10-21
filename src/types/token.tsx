export type TokenStatus = "Vivo" | "Morto";
export type TokenTeam = "Red" | "Blue" | "Green" | "Yellow";

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

export interface Token {
  id: string;
  name: string;
  imageUrl: string;
  attributes: TokenAttributes;
  status: TokenStatus;
  team: TokenTeam;
  position: { col: number; row: number };
}
