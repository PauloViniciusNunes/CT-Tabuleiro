import React, { useState } from "react";
import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";
import { calculateActionRoll } from "../../utils/battleCalculations";

interface DefenseResolutionFormProps {
  attacker: Token;
  defenderName: string;
  reactionResult: number;
  availableActions: number;
  onResolve: (usedActions: number, result: RollResult) => void; // ⬅️ ADICIONE usedActions
  onCancel: () => void;
}

const DefenseResolutionForm: React.FC<DefenseResolutionFormProps> = ({
  attacker,
  defenderName,
  reactionResult,
  availableActions, // ⬅️ NOVA PROP
  onResolve,
  onCancel,
}) => {
  const [usedMana, setUsedMana] = useState(0);
  const [usedActions, setUsedActions] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const availableMana = attacker.currentMana ?? 0;
  const maxAvailableActions = Math.max(1, availableActions); // ⬅️ USA O VALOR REAL

  const hasEnoughMana = usedMana <= availableMana;
  const hasEnoughActions = usedActions >= 1 && usedActions <= maxAvailableActions;
  const isFormValid = hasEnoughMana && hasEnoughActions;

  const handleResolve = async () => {
  if (!isFormValid || isLoading) return;

  setIsLoading(true);

  try {
    console.log("🎯 DefenseResolutionForm: Executando Definição de Velocidade");

    const proficiencyBonus = attacker.proficiencies.destreza
      ? Math.ceil((attacker.attributes.level - 10) / 4 + 4)
      : 0;

    const params = {
      tokenId: attacker.id,
      Q: usedActions,
      P: 1,
      A: attacker.attributes.destreza,
      PF: proficiencyBonus,
      O: 0,
      N: usedMana > 0 ? 1 : 0,
      L: attacker.attributes.level,
      M: usedMana,
    };

    const rollResult = calculateActionRoll(params);

    console.log("⚔️ Comparação de Velocidade:", {
      esquivaDoDefensor: reactionResult,
      definiçãoDoAtacante: rollResult.total,
      resultado:
        rollResult.total >= reactionResult
          ? "ACERTA (Dano aplicado)"
          : "DESVIA (Sem dano)",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    onResolve(usedActions, rollResult); // ⬅️ PASSE usedActions
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-96 border-2 border-cyan-600 shadow-lg">
      <h3 className="text-cyan-300 font-bold mb-2">
        ⚔️ Definição de Velocidade
      </h3>

      {/* Context */}
      <div className="mb-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
        <p>
          <span className="text-cyan-300 font-semibold">{attacker.name}</span>{" "}
          tenta acertar a esquiva de
          <span className="text-red-300 font-semibold"> {defenderName}</span>
        </p>
        <p className="mt-2">
          Resultado da Esquiva:{" "}
          <span className="text-cyan-400 font-bold">{reactionResult}</span>
        </p>
        <p className="text-xs italic text-gray-400 mt-2">
          Se Definição ≥ Esquiva → Acerta com dano completo
          <br />
          Se Definição &lt; Esquiva → Desvia, dano = 0
        </p>
      </div>

      {/* Ações Usadas */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Ações para Definição (Disponível: {maxAvailableActions})
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
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm disabled:opacity-60"
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
          className={`w-full p-2 rounded border focus:outline-none text-sm disabled:opacity-60 ${
            !hasEnoughMana
              ? "bg-red-900 border-red-600 text-red-100"
              : "bg-gray-700 border-gray-600 text-white"
          }`}
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <button
          onClick={handleResolve}
          disabled={!isFormValid || isLoading}
          className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
            isFormValid && !isLoading
              ? "bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer"
              : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-60"
          }`}
          title={!isFormValid ? "Preencha todos os campos" : "Executar definição"}
        >
          {isLoading ? "Processando..." : "Executar"}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 px-3 rounded font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default DefenseResolutionForm;
