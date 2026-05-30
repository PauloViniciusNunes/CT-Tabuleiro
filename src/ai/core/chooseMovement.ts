import type { Token }
from "../../types/token";

interface ChooseMovementParams {

  self: Token;

  target: Token;

}

interface MovementDecision {

  targetCol: number;

  targetRow: number;

}

export function chooseMovement({

  self,
  target

}: ChooseMovementParams):

  MovementDecision | null {

  /*
    Posição atual.
  */

  let col =
    self.position.col;

  let row =
    self.position.row;

  /*
    Alvo.
  */

  const targetCol =
    target.position.col;

  const targetRow =
    target.position.row;

  /*
    Anda até ficar
    adjacente ao alvo.
  */

  while (

    Math.max(

      Math.abs(col - targetCol),

      Math.abs(row - targetRow)

    ) > 1

  ) {

    /*
      Horizontal.
    */

    if (col < targetCol) {

      col++;

    } else if (
      col > targetCol
    ) {

      col--;

    }

    /*
      Vertical.
    */

    if (row < targetRow) {

      row++;

    } else if (
      row > targetRow
    ) {

      row--;

    }

  }

  return {

    targetCol: col,

    targetRow: row

  };

}