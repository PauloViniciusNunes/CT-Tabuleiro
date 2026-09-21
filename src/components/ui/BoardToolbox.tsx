import { LockKeyhole, Ruler } from "lucide-react";

import { BOARD_TOOLS, canUseBoardTool } from "../../tools/boardTools";
import type { BoardToolId } from "../../types/tools";

interface BoardToolboxProps {
  activeTool: BoardToolId | null;
  isGameMaster: boolean;
  onSelectTool: (toolId: BoardToolId) => void;
}

const iconByTool: Record<BoardToolId, typeof Ruler> = {
  ruler: Ruler,
};

export default function BoardToolbox({
  activeTool,
  isGameMaster,
  onSelectTool,
}: BoardToolboxProps) {
  return (
    <aside
      aria-label="Ferramentas do tabuleiro"
      className="absolute left-3 top-1/2 z-40 flex w-12 -translate-y-1/2 flex-col gap-2 rounded-2xl border border-slate-700 bg-gray-900/95 p-1.5 shadow-xl backdrop-blur"
    >
      {BOARD_TOOLS.map((tool) => {
        const Icon = iconByTool[tool.id];
        const isAvailable = canUseBoardTool(tool.access, isGameMaster);
        const isSelected = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            type="button"
            aria-label={tool.label}
            aria-pressed={isSelected}
            disabled={!isAvailable}
            title={
              isAvailable
                ? `${tool.label}: ${tool.description}`
                : `${tool.label}: disponível apenas para o Mestre`
            }
            onClick={() => onSelectTool(tool.id)}
            className={[
              "relative flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
              isSelected
                ? "border-blue-300 bg-blue-600 text-white shadow-[0_0_12px_rgba(96,165,250,0.65)]"
                : "border-transparent text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white",
              !isAvailable ? "cursor-not-allowed opacity-45" : "",
            ].join(" ")}
          >
            <Icon size={19} strokeWidth={2.25} />
            {!isAvailable && (
              <LockKeyhole
                aria-hidden="true"
                size={11}
                className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 p-px text-slate-300"
              />
            )}
          </button>
        );
      })}
    </aside>
  );
}
