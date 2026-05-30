// src/ai/executeAIMovement.ts

import type { Token }
from "../types/token";

import { chooseMovement }
from "./core/chooseMovement";

interface ExecuteAIMovementParams {

  self: Token;

  target: Token;

  moveToken: (
    tokenId: string,
    col: number,
    row: number
  ) => void;

  onComplete?: (
    updatedSelf: Token
  ) => void;

}

export function executeAIMovement({

  self,
  target,
  moveToken,
  onComplete

}: ExecuteAIMovementParams) {

  /*
    Decide próximo passo.
  */

  const decision =
    chooseMovement({

      self,
      target

    });

  /*
    Segurança.
  */

  if (!decision) {

    console.warn(
      "IA não conseguiu decidir movimento."
    );

    onComplete?.(self);

    return;

  }

  /*
    Próxima posição.
  */

  const nextCol =
    decision.targetCol;

  const nextRow =
    decision.targetRow;

  /*
    Delay procedural.
  */

  setTimeout(() => {

    /*
      Move token.
    */

    moveToken(

      self.id,

      nextCol,

      nextRow

    );

    console.info(

      `[IA MOVEU] ${self.id} -> (${nextCol}, ${nextRow})`

    );

    /*
      Atualiza self.
    */

    const updatedSelf: Token = {

      ...self,

      position: {

        col: nextCol,

        row: nextRow

      }

    };

    /*
      Continua fluxo.
    */

    onComplete?.(
      updatedSelf
    );

  }, 500);

}