import { ChevronDown, ChevronUp } from "lucide-react";

interface BattleFormToggleProps {
  visible: boolean;
  onToggle: () => void;
  label: string;
}

/**
 * Keeps a battle form reachable without occupying the board. It deliberately
 * lives outside the lower-left presence list, so player names never cover it.
 */
export function BattleFormToggle({
  visible,
  onToggle,
  label,
}: BattleFormToggleProps) {
  const action = visible ? "Ocultar" : "Mostrar";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${action} ${label}`}
      title={`${action} ${label}`}
      className="fixed bottom-4 right-4 z-[130] rounded-full border border-slate-500 bg-slate-900 p-4 text-white shadow-lg transition-transform hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-95"
    >
      {visible ? (
        <ChevronDown className="h-5 w-5" aria-hidden="true" />
      ) : (
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
