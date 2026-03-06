import type { TokenAttributes } from "./token";

export type BattleStatus = "Not in Battle" | "In Battle";

export interface InitiativeData {
  tokenId: string;
  initiative: number;
  hasExtraTurn: boolean;
}

export interface ActionRollParams {
  // Remova esta linha:
  tokenId: string;
  Q: number; // Quantidade de d20s
  P: number; // P (posição)
  A: number; // Atributo
  PF: number;// Proficiência
  O: number; // O (Adição Ocasional)
  N: number; // N (Houve uso de mana?)
  L: number; // Level
  M: number; // Mana usada
  CRI?: number; // Crítico
}

export interface RollResult {
  rawRolls: number[];
  total: number;
  usedMana: number;
  CRI: number;
}

export interface ActionChoice {
  attribute: keyof Omit<TokenAttributes, "level" | "xp">;
  type: string;
  rollResult: RollResult;
  attackerId?: string;  // ← Adicione
  targetId?: string;    // ← Adicione
  round?: number; // ← Adicione isto
}

/**
 * Descreve um efeito aplicado a um token.
 */
export interface TurnEffect {
  type: string;
  intensity: number;
  duration: number;
  appliedAtRound: number;
  moment: "OwnTurn" | "AnyTurn";
}

export interface BattleState {
  status: BattleStatus;
  round: number;
  turnOrder: InitiativeData[];
  currentTurnIndex: number;
  accumulatedActions: Record<string, number>;
  activeEffects: Record<string, TurnEffect[]>;
  actionHistory: ActionChoice[];
}
