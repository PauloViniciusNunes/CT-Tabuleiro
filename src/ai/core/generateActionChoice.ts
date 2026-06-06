import type { Card } from "../../types/card";
import type { ExecuteChoice } from "../../types/executeChoice";
import type { Token } from "../../types/token";
import type { AIRepertory } from "../types/aiContext";
import { randomInt } from "../../utils/battleCalculations";

function decideActionType(mana: number, maxMana: number): string {
  if (mana === 0) {
    return "mana_recover";
  }
  if(mana !== maxMana && Math.random() < 0.5) {
    return "mana_recover";
  }
  return "attack";
}

export function generateActionChoice(
  attacker: Token,
  attackerRepertory: AIRepertory,
  target: Token,
  card: Card | undefined
): ExecuteChoice {

  const actions = attackerRepertory.accumulatedActions;
  const mana = attackerRepertory.avaiableMana;
  const cards = attackerRepertory.avaiableCards;

  const usedActions = randomInt(1, actions);
  const decideUseMana: boolean = mana > 0 && Math.random() >= 0.5;
  const usedMana = decideUseMana ? randomInt(1, mana) : 0;

  const actionType = decideActionType(mana, attacker.maxMana ?? 0);

  return {

    attribute: "forca",

    type: "Ataque IA",

    targetId: target.id,

    usedMana: usedMana,

    usedActions: usedActions,

    usedCertaintyDie: false,

    pos: 1,

    actionType: actionType,

    cardId: card?.id,

  };

}