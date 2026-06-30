import type { TokenAttributes, Token } from "./token";
import type { Item } from "./item";
import type { TokenPrimaryElement } from "./effects";

export type AllocatedPoints = {
    forca: number;
    destreza: number;
    consistencia: number;
    inteligencia: number;
    sabedoria: number;
    carisma: number;
};
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
  attackerId?: string;  // ← Adicione
  targetId?: string;    // ← Adicione
  round?: number; // ← Adicione isto
  rollResult?: RollResult;
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

export interface BattleLocks {
  aiActing: boolean;
  reallocating: boolean;
  resolvingAction: boolean;
}

export type ActionInformation = {
  actorId: string | null;
  version: number;
}


export type PendingReaction = {
  type: "consistencia" | "destreza";
  targetToken: Token;
};

export type PendingAttack =
{
  attackerId: string;
  targetId: string;
  rawDamage: number;
  attackRoll: number;
  usedMana: number;
  attackAttribute: ActionChoice['attribute'];
  pendingReactions: PendingReaction[];
  isReactionAllowed: boolean;
  isFreeAttack?: boolean;
  usedActions: number;
  atackElement: TokenPrimaryElement;
  usedItem?: Item;
}

export interface BattleState {
  status: BattleStatus;
  round: number;
  turnOrder: InitiativeData[];
  currentTurnIndex: number;
  currentActorId: string | null;
  phase: string;
  locks: BattleLocks;
  accumulatedActions: Record<string, number>;
  activeEffects: Record<string, TurnEffect[]>;
  actionHistory: ActionChoice[];
  isReallocatingTurns: boolean;
  isAIActing: boolean;
  turnVersion: number;
}

