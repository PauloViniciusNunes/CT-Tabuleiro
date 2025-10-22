export type BattleStatus = "Not in Battle" | "In Battle";

export type TurnEffectType =
  | "Queimando"
  | "Queimando a chamas sombrias"
  | "Congelado"
  | "Envenenado"
  | "Enfraquecido"
  | "Preso"
  | "Sangrando"
  | "Cego"
  | "Intangível"
  | "Afogando"
  | "Boost de Força"
  | "Boost de Destreza"
  | "Boost de Consistência"
  | "Boost de Inteligência"
  | "Boost de Sabedoria"
  | "Boost de Carisma";

export type EffectMoment = "OwnTurn" | "AnyTurn";

export interface TurnEffect {
  type: TurnEffectType;
  intensity: number;
  duration: number;
  appliedAtRound: number;
  moment: EffectMoment;
}

export interface InitiativeData {
  tokenId: string;
  initiative: number;
  hasExtraTurn: boolean;
}

export interface BattleState {
  status: BattleStatus;
  round: number;
  turnOrder: InitiativeData[];
  currentTurnIndex: number;
  accumulatedActions: Record<string, number>;
  activeEffects: Record<string, TurnEffect[]>;
}
