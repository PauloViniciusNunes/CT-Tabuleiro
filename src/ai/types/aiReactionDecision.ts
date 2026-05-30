export interface AIReactionDecision {

  reactionType:
    | "destreza"
    | "consistencia";

  usedMana: number;

  usedActions: number;

  usedCertaintyDie: boolean;

}