import { chooseReaction }
from "./core/chooseReaction";

import { generateReactionRoll }
from "./core/generateReactionRoll";

import type { Token }
from "../types/token";

import type { RollResult }
from "../types/battle";

type IncomingAttribute =
  | "forca"
  | "destreza"
  | "inteligencia"
  | "sabedoria";

interface ExecuteAIReactionParams {

  self: Token;

  incomingAttribute: IncomingAttribute;

  availableActions: number;

  handleReaction: (

    reactionType:
      | "consistencia"
      | "destreza"
      | "inteligencia"
      | "sabedoria",

    usedMana: number,

    usedActions: number,

    roll: RollResult,

    usedCertaintyDie: boolean

  ) => void;

}

export function executeAIReaction({

  self,
  incomingAttribute,
  availableActions,
  handleReaction

}: ExecuteAIReactionParams) {

  /*
    Decide reação
  */

  const decision =
    chooseReaction({

      self,
      incomingAttribute,
      availableActions

    });

  /*
    SEGURANÇA:
    IA submissa ao sistema.
  */

  if (!decision) {

    console.warn(
      "IA não possui reação válida."
    );

    return;

  }

  /*
    Roll REAL
  */

  const roll =
    generateReactionRoll(

      self,

      decision.reactionType,

      decision.usedMana,

      decision.usedActions

    );

  console.info(
    "Tipo de Reação:",
    decision.reactionType
  );

  console.info(
    "Mana Usada:",
    decision.usedMana
  );

  console.info(
    "Ações Usadas:",
    decision.usedActions
  );

  console.info(
    "Roll:",
    roll
  );

  /*
    Executa reação
  */

  handleReaction(

    decision.reactionType,

    decision.usedMana,

    decision.usedActions,

    roll,

    false // IA NUNCA usa dado certo

  );

}