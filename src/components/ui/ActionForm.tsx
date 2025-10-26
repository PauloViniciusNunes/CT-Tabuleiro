import React, { useState } from "react";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";
import { calculateDistance, isInAttackRange } from "../../utils/battleCalculations";

interface ActionFormProps {
  token: Token;
  availableActions: number;
  onExecute: (
    choice: ActionChoice & {
      targetId: string;
      usedMana: number;
      usedActions: number;
    }
  ) => void;
  onPass: () => void;
  possibleTargets: Token[];
}

const ActionForm: React.FC<ActionFormProps> = ({
  token,
  availableActions,
  onExecute,
  onPass,
  possibleTargets,
}) => {
  const [selectedAction, setSelectedAction] = useState<
    "forca" | "destreza" | null
  >(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [usedMana, setUsedMana] = useState(0);
  const [usedActions, setUsedActions] = useState(1);

  const targetToken = possibleTargets.find((t) => t.id === selectedTarget);

  // Verifica se o ataque está em alcance
  const isPhysicalAttack =
    selectedAction && ["forca", "destreza"].includes(selectedAction);
  const canAttack =
    !targetToken ||
    (isPhysicalAttack && isInAttackRange(token, targetToken, "fisico"));
  const distance = targetToken ? calculateDistance(token, targetToken) : 0;
  const maxRange = token.bodytobodyRange || 1;

  const hasEnoughActions = usedActions <= availableActions;
  const hasEnoughMana = usedMana <= (token.currentMana ?? 0);
  const isFormValid =
    selectedAction && selectedTarget && hasEnoughActions && hasEnoughMana;

  const handleExecute = () => {
    if (!isFormValid || !canAttack) return;

    onExecute({
      attribute: selectedAction,
      type:
        selectedAction === "forca"
          ? "Ataque Físico"
          : "Ataque com Destreza",
      targetId: selectedTarget,
      usedMana,
      usedActions,
    } as ActionChoice & {
      targetId: string;
      usedMana: number;
      usedActions: number;
    });

    // Reseta o formulário
    setSelectedAction(null);
    setSelectedTarget(null);
    setUsedMana(0);
    setUsedActions(1);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-80 border border-gray-700 shadow-lg">
      <h3 className="text-white font-bold mb-3">Ação de {token.name}</h3>

      {/* Seleção de Ação */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Tipo de Ataque
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedAction("forca")}
            className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
              selectedAction === "forca"
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Força
          </button>
          <button
            onClick={() => setSelectedAction("destreza")}
            className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
              selectedAction === "destreza"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Destreza
          </button>
        </div>
      </div>

      {/* Seleção de Alvo */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Alvo
        </label>
        <select
          value={selectedTarget || ""}
          onChange={(e) => setSelectedTarget(e.target.value || null)}
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-400 focus:outline-none text-sm"
        >
          <option value="">Selecione um alvo</option>
          {possibleTargets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Indicador de Distância */}
        {targetToken && (
          <div
            className={`mt-2 text-xs p-2 rounded ${
              canAttack
                ? "bg-green-900 text-green-200 border border-green-600"
                : "bg-red-900 text-red-200 border border-red-600"
            }`}
          >
            {canAttack
              ? `✓ Distância: ${distance} célula(s) (Alcance: ${maxRange})`
              : `✗ Fora do alcance! Distância: ${distance}, Alcance: ${maxRange}`}
          </div>
        )}
      </div>

      {/* Ações Usadas */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-300 mb-1">
          Ações Usadas (Disponível: {availableActions})
        </label>
        <input
          type="number"
          min={1}
          max={availableActions}
          value={usedActions}
          onChange={(e) =>
            setUsedActions(Math.max(1, Math.min(availableActions, Number(e.target.value))))
          }
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
          Mana Usada (Disponível: {token.currentMana ?? 0})
        </label>
        <input
          type="number"
          min={0}
          max={token.currentMana ?? 0}
          value={usedMana}
          onChange={(e) =>
            setUsedMana(Math.max(0, Math.min(token.currentMana ?? 0, Number(e.target.value))))
          }
          className={`w-full p-2 rounded border focus:outline-none text-sm ${
            !hasEnoughMana
              ? "bg-red-900 border-red-600 text-red-100"
              : "bg-gray-700 border-gray-600 text-white"
          }`}
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <button
          onClick={handleExecute}
          disabled={!isFormValid || !canAttack}
          className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
            isFormValid && canAttack
              ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-60"
          }`}
          title={
            !canAttack
              ? "Alvo fora do alcance"
              : !isFormValid
              ? "Preencha todos os campos"
              : "Executar ataque"
          }
        >
          Executar
        </button>
        <button
          onClick={onPass}
          className="flex-1 py-2 px-3 rounded font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          Passar
        </button>
      </div>
    </div>
  );
};

export default ActionForm;
