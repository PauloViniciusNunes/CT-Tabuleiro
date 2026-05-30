import type { Token }
from "../../types/token";

import { getAvailableResponses }
from "./getAvailableResponses";

import { reactionMatrix }
from "../constants/reactionMatrix";

type IncomingAttribute =
  | "forca"
  | "destreza"
  | "inteligencia"
  | "sabedoria";

interface ChooseReactionParams {

  self: Token;

  incomingAttribute: IncomingAttribute;

  availableActions: number;

}

export function chooseReaction({

  self,
  incomingAttribute,
  availableActions

}: ChooseReactionParams) {

  /*
    SEGURANÇA MÁXIMA:
    se o atributo nem
    existir na matriz,
    aborta.
  */

  const allowed =
    reactionMatrix[
      incomingAttribute
    ];

  if (!allowed) {

    return null;

  }

  const responses =
    getAvailableResponses({

      self,
      incomingAttribute,
      availableActions

    });

  /*
    Segunda camada:
    remove QUALQUER
    resposta inválida
    por segurança.
  */

  const validResponses =
    responses.filter(
      response =>
        allowed.includes(
          response.reactionType
        )
    );

  if (
    validResponses.length <= 0
  ) {

    return null;

  }

  validResponses.sort(
    (a, b) =>
      b.score - a.score
  );

  return validResponses[0];

}