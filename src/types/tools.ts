export type BoardToolId = "ruler";

export type ToolAccess = "everyone" | "game-master";

export interface BoardToolDefinition {
  id: BoardToolId;
  label: string;
  description: string;
  access: ToolAccess;
}

export interface GridPoint {
  col: number;
  row: number;
}

export interface RulerMeasurement {
  start: GridPoint;
  end: GridPoint;
  distance: number;
}
