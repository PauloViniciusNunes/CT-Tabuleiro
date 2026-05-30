import type { Token }
from "../../types/token";

import type { AIResponseOption }
from "../types/aiResponseOption";

type IncomingAttribute =
  | "forca"
  | "destreza"
  | "inteligencia"
  | "sabedoria";

interface ScoreReactionParams {

  self: Token;

  option: AIResponseOption;

  incomingAttribute: IncomingAttribute;

}

export function scoreReaction({

  self,
  option,
  incomingAttribute

}: ScoreReactionParams): number {

  let score = 0;

  /*
    SCORE BASE:
    valor do atributo usado
    na reação.
  */

  const attributeValue =
    self.attributes[
      option.reactionType
    ] ?? 0;

  score += attributeValue;

  /*
    PROFICIÊNCIA
  */

  const hasProficiency =
    self.proficiencies[
      option.reactionType
    ];

  if (hasProficiency) {

    score += 4;

  }

  /*
    BONUS CONTEXTUAL
  */

  switch (incomingAttribute) {

    /*
      FORÇA:
      Consistência é mais estável.
    */

    case "forca":

      if (
        option.reactionType ===
        "consistencia"
      ) {

        score += 6;

      }

      if (
        option.reactionType ===
        "destreza"
      ) {

        score += 2;

      }

      break;

    /*
      SURPREENDER
    */

    case "destreza":

      if (
        option.reactionType ===
        "destreza"
      ) {

        score += 10;

      }

      break;

    /*
      PREVER
    */

    case "inteligencia":

      if (
        option.reactionType ===
        "inteligencia"
      ) {

        score += 10;

      }

      break;

    /*
      DESNORTEAR
    */

    case "sabedoria":

      if (
        option.reactionType ===
        "sabedoria"
      ) {

        score += 10;

      }

      break;

  }

  /*
    ECONOMIA DE MANA

    IA básica:
    evita gastar mana
    sem necessidade.
  */

  if (
    option.usedMana <= 0
  ) {

    score += 2;

  }

  /*
    ECONOMIA DE AÇÕES
  */

  if (
    option.usedActions <= 1
  ) {

    score += 1;

  }

  return score;

}