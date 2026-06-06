import type { Position } from "../types/card";

export function getCellsInRadius(
    center: Position,
    radius: number,
    gridCells: Position[]
  ): Position[] {
    return gridCells.filter(cell => {
      const dx = Math.abs(cell.col - center.col);
      const dy = Math.abs(cell.row - center.row);
      return dx <= radius && dy <= radius;
    });
  }