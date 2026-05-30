import type { Card } from "../../types/card";
import type { ExecuteChoice } from "../../types/executeChoice";
import type { Token } from "../../types/token";

export function generateActionChoice(
  attacker: Token,
  target: Token,
  card: Card | undefined
): ExecuteChoice {

  return {

    attribute: "forca",

    type: "Ataque IA",

    targetId: target.id,

    usedMana: 0,

    usedActions: 1,

    usedCertaintyDie: false,

    pos: 1,

    actionType: "attack",

    cardId: card?.id,

  };

}