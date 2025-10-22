import React from "react";
import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";

interface ReactionPromptProps {
  actor: Token;
  onReact: (roll: RollResult) => void;
  onSkip: () => void;
}

export const ReactionPrompt: React.FC<ReactionPromptProps> = ({
  actor,
  onReact,
  onSkip,
}) => {
  return (
    <div className="absolute top-32 right-[calc(250px+5px)] w-60 bg-gray-800 p-3 rounded shadow-lg text-white">
      <h4 className="font-semibold mb-2">Reação: {actor.name}</h4>
      <div className="flex justify-end gap-2">
        <button
          onClick={onSkip}
          className="px-2 py-1 bg-gray-600 rounded hover:bg-gray-500"
        >
          Ignorar
        </button>
        <button
          onClick={() => onReact(undefined!)}
          className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
        >
          Reagir
        </button>
      </div>
    </div>
  );
};

export default ReactionPrompt;
