import type { ReactionType }
from "./reactionType";

export interface AIResponseOption {

  reactionType: ReactionType;

  usedActions: number;

  usedMana: number;

  score: number;

}