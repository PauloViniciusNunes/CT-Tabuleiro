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
    Um passo por chamada.
    O fluxo procedural chama esta função novamente
    depois que a grid renderiza o movimento.
  */

  if (
    Math.max(
      Math.abs(col - targetCol),
      Math.abs(row - targetRow)
    ) <= 1
  ) {
    return null;
  }

  if (col < targetCol) {
    col++;
  } else if (col > targetCol) {
    col--;
  }

  if (row < targetRow) {
    row++;
  } else if (row > targetRow) {
    row--;
  }

  return {

    targetCol: col,

    targetRow: row

  };

}
