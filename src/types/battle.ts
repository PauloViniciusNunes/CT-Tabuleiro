import type { TokenAttributes } from "./token";

export type BattleStatus = "Not in Battle" | "In Battle";

export interface InitiativeData {
  tokenId: string;
  initiative: number;
  hasExtraTurn: boolean;
}

export interface ActionRollParams {
  tokenId: string;
  Q: number;
  P: number;
  A: number;
  O: number;
  N: number;
  L: number;
  M: number;
  CRI: number;
}

export interface RollResult {
  rawRolls: number[];
  total: number;
  usedMana: number;
}

export interface ActionChoice {
  attribute: keyof Omit<TokenAttributes, "level" | "xp">;
  type: string;
  rollResult: RollResult;
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
