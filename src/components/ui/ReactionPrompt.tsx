import React, { useState } from "react";
import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";
import { calculateActionRoll } from "../../utils/battleCalculations";

type ReactionActor = Token & { reactionType: "consistencia" | "destreza" };

interface ReactionPromptProps {
  actor: ReactionActor;
  availableActions: number;
  onReact: (
    actorId: string,
    reactionType: "consistencia" | "destreza",
    usedMana: number,
    usedActions: number, // ⬅️ ADICIONE
    roll: RollResult
  ) => void;
}

const ReactionPrompt: React.FC<ReactionPromptProps> = ({
  actor,
  availableActions, // ⬅️ NOVA PROP
  onReact,
}) => {
  const [selectedAttribute, setSelectedAttribute] = useState<
    "consistencia" | "destreza" | null
  >(null);
  const [usedMana, setUsedMana] = useState(0);
  const [usedActions, setUsedActions] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const maxAvailableActions = Math.max(1, availableActions); // ⬅️ USA O VALOR REAL
  const availableMana = actor.currentMana ?? 0;

  const hasEnoughMana = usedMana <= availableMana;
  const hasEnoughActions = usedActions >= 1 && usedActions <= maxAvailableActions;
  const isFormValid = selectedAttribute && hasEnoughMana && hasEnoughActions;

 const handleReact = async () => {
  if (!isFormValid || isLoading) return;

  setIsLoading(true);

  try {
    const proficiencyBonus = actor.proficiencies[selectedAttribute!]
      ? Math.ceil((actor.attributes.level - 10) / 4 + 4)
      : 0;

    const params = {
      tokenId: actor.id,
      Q: usedActions,
      P: 1,
      A: actor.attributes[selectedAttribute!],
      PF: proficiencyBonus,
      O: 0,
      N: usedMana > 0 ? 1 : 0,
      L: actor.attributes.level,
      M: usedMana,
    };

    const rollResult = calculateActionRoll(params);

    await new Promise((resolve) => setTimeout(resolve, 300));

    onReact(actor.id, selectedAttribute!, usedMana, usedActions, rollResult); // ⬅️ PASSE usedActions
  } finally {
    setIsLoading(false);
  }
};

  const reactionTypeLabel =
    actor.reactionType === "consistencia"
      ? "Defesa (Consistência)"
      : "Esquiva (Destreza)";

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-80 border-2 border-purple-600 shadow-lg">
      <h3 className="text-purple-300 font-bold mb-2">
        ⚡ Reação de {actor.name}
      </h3>
      <p className="text-xs text-gray-400 mb-3">{reactionTypeLabel}</p>

      {/* Seleção de Atributo */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Atributo de Reação
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedAttribute("consistencia")}
            disabled={isLoading}
            className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
              selectedAttribute === "consistencia"
                ? "bg-yellow-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Consistência
          </button>
          <button
            onClick={() => setSelectedAttribute("destreza")}
            disabled={isLoading}
            className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
              selectedAttribute === "destreza"
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Destreza
          </button>
        </div>

        {selectedAttribute && (
          <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-700 rounded">
            {selectedAttribute === "consistencia"
              ? "Defesa: Reduz o dano recebido"
              : "Esquiva: Chance binária de desviar todo o dano"}
          </p>
        )}
      </div>

      {/* Ações Usadas */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Ações Usadas (Disponível: {maxAvailableActions})
        </label>
        <input
          type="number"
          min={1}
          max={maxAvailableActions}
          value={usedActions}
          onChange={(e) =>
            setUsedActions(
              Math.max(1, Math.min(maxAvailableActions, Number(e.target.value)))
            )
          }
          disabled={isLoading}
          className={`w-full p-2 rounded border focus:outline-none text-sm ${
            !hasEnoughActions
              ? "bg-red-900 border-red-600 text-red-100"
              : "bg-gray-700 border-gray-600 text-white"
          }`}
        />
      </div>

      {/* Mana Usada */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Mana Usada (Disponível: {availableMana})
        </label>
        <input
          type="number"
          min={0}
          max={availableMana}
          value={usedMana}
          onChange={(e) =>
            setUsedMana(
              Math.max(0, Math.min(availableMana, Number(e.target.value)))
            )
          }
          disabled={isLoading}
          className={`w-full p-2 rounded border focus:outline-none text-sm ${
            !hasEnoughMana
              ? "bg-red-900 border-red-600 text-red-100"
              : "bg-gray-700 border-gray-600 text-white"
          }`}
        />
      </div>

      {/* Botão de Ação */}
      <div className="flex">
        <button
          onClick={handleReact}
          disabled={!isFormValid || isLoading}
          className={`w-full py-2 px-3 rounded font-semibold text-sm transition-colors ${
            isFormValid && !isLoading
              ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-60"
          }`}
          title={!isFormValid ? "Preencha todos os campos" : "Executar reação"}
        >
          {isLoading ? "Processando..." : "Reagir"}
        </button>
      </div>
    </div>
  );
};

export default ReactionPrompt;
