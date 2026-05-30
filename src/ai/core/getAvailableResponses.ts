import type { Token }
from "../../types/token";

import type { AIResponseOption }
from "../types/aiResponseOption";

import { reactionMatrix }
from "../constants/reactionMatrix";

import { scoreReaction } from "./scoreReaction";

type IncomingAttribute =
  | "forca"
  | "destreza"
  | "inteligencia"
  | "sabedoria";

interface GetAvailableResponsesParams {

  self: Token;

  incomingAttribute: IncomingAttribute;

  availableActions: number;

}

export function getAvailableResponses({

  self,
  incomingAttribute,
  availableActions

}: GetAvailableResponsesParams)
: AIResponseOption[] {

  /*
    PRIMEIRA CAMADA:
    FILTRAGEM SISTÊMICA

    A IA NÃO PODE
    inventar reações.
  */

  const allowedReactions =
    reactionMatrix[
      incomingAttribute
    ];

  if (!allowedReactions) {
    return [];
  }

  const responses: AIResponseOption[] = [];

  for (const reactionType of allowedReactions) {

    /*
      FILTRO DE SEGURANÇA:
      garante que o token
      realmente possui
      o atributo necessário.
    */

    const attributeValue =
      self.attributes[
        reactionType
      ];

    if (
      attributeValue == null
    ) {

      continue;

    }

    /*
      Geração da opção
      válida
    */

    const option: AIResponseOption = {

      reactionType,

      usedActions: Math.min(
        1,
        Math.max(
          1,
          availableActions
        )
      ),

      usedMana: 0,
      score: 0

    };

    /*
      SOMENTE AGORA:
      pontuação
    */

    option.score =
      scoreReaction({

        self,

        option,

        incomingAttribute

      });

    responses.push(option);

  }

  return responses;

}