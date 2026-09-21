import type { TokenAttributes, Token } from "./token";
import type { Item } from "./item";
import type { PrimaryMechanic } from "./effects";
import type { MechanicOverlay } from "./card";

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
  /** ID do item selecionado para a rolagem, ou undefined sem item. */
  usedItemId: string | undefined;
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

export interface FreeResponse {
    responderId: string;
    paralyzedId: string;
}

export interface ActionChoice {
  attribute: keyof Omit<TokenAttributes, "level" | "xp">;
  type: string;
  attackerId?: string;  // ← Adicione
  targetId?: string;    // ← Adicione
  round?: number; // ← Adicione isto
  rollResult?: RollResult;
  selectedMechanic?: PrimaryMechanic;
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

export interface ActiveMechanic {
  id: string;
  definitionId: string;
  name?: string;
  sourceTokenId: string;
  intensity: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface BattleLocks {
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
    atackElement: PrimaryMechanic;
    usedItem?: Item;
  }

export interface BattleState {
  id: string,
  status: BattleStatus;
  round: number;
  turnOrder: InitiativeData[];
  currentTurnIndex: number;
  currentActorId: string | null;
  currentActorUserId: string;
  phase: string;
  locks: BattleLocks;
  accumulatedActions: Record<string, number>;
  activeEffects: Record<string, TurnEffect[]>;
  actionHistory: ActionChoice[];
  isReallocatingTurns: boolean;
  turnVersion: number;
  movedThisTurn?: Record<string, boolean>;
  tokensBattlePosition: Record<string, number>;
  previsionActions: Record<string, number>;
  mapId: string;
  cardsNotRechargeds: Record<string, string[]>,
  timeToRechargeCard: Record<string, number>
  tokensInOffensiveCard: Token[],
  maxSelectablePivots: number,
  remainingPivots: number
  activeMechanics?: ActiveMechanic[];
  mechanicEntitiesInstances: MechanicOverlay[]
}
