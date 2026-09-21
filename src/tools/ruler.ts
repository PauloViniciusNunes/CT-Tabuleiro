import type { GridPoint, RulerMeasurement } from "../types/tools";

export function measureCells(
  start: GridPoint,
  end: GridPoint,
): RulerMeasurement {
  return {
    start,
    end,
    distance: Math.max(
      Math.abs(end.col - start.col),
      Math.abs(end.row - start.row),
    ),
  };
}

export function formatCellDistance(distance: number): string {
  const displayDistance = Number.isInteger(distance)
    ? distance.toString()
    : distance.toFixed(2);

  return `${displayDistance} ${distance === 1 ? "célula" : "células"}`;
}
