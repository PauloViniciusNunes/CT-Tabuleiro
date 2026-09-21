import type { BoardToolDefinition, ToolAccess } from "../types/tools";

export const BOARD_TOOLS = [
  {
    id: "ruler",
    label: "Régua",
    description: "Meça a distância entre duas células.",
    access: "everyone",
  },
] as const satisfies readonly BoardToolDefinition[];

export function canUseBoardTool(
  access: ToolAccess,
  isGameMaster: boolean,
): boolean {
  return access === "everyone" || isGameMaster;
}
