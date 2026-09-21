import type React from "react";
import { useRef, useState } from "react";
import { Shield, XCircle } from "lucide-react";
import {GiDiceTwentyFacesTwenty } from "react-icons/gi";
import { Brain } from "lucide-react";

import type { Card, OffensiveCardAttribute } from "../../types/card";
import type { Token } from "../../types/token";
import { type ResultType } from "../../utils/battleCalculations";
import { calculateMedianRoll } from "../../utils/battleCalculations";

interface OffensiveCardProps {
  card: Card;
  cardResult: number;
  testResult: number;

  availableActions: number;
  availableMana:    number;
  availableCertainyDie: number;

  defenderToken: Token;
  defenderTokenPrevActions: number,
  tokenBattlePosition: (attr: OffensiveCardAttribute) => number;
  onExecute: (choice: {
    defenderId: string;
    attribute: OffensiveCardAttribute;
    usedMana: number;
    usedActions: number;
    usedCertainDie: boolean;
    previewAction: boolean;
  }) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}



const OffensiveCardResolution: React.FC<OffensiveCardProps> = ({
  card,
  cardResult,
  testResult,
  availableActions,
  availableMana,
  availableCertainyDie,
  defenderToken,
  defenderTokenPrevActions,
  tokenBattlePosition,
  onExecute,
  onCancel,
}) => {
  const tokenProficiency = Math.ceil(
    (defenderToken.attributes.level - 10) / 4 + 4
  );

  const [usedMana, setUsedMana] = useState(0);
  const [usedActions, setUsedActions] = useState(1);
  const [selectedAttribute, setSelectedAttribute] =
    useState<OffensiveCardAttribute>("forca");
  const [usedCertaintyDie, setUsedCertaintyDie] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const previewDefenseRoll = calculateMedianRoll(
    usedActions,
    usedMana,
    tokenBattlePosition(selectedAttribute),
    tokenProficiency,
    defenderToken.attributes[selectedAttribute],
    0,
  );

  const resultType: ResultType = usedCertaintyDie
    ? "total"
    : previewDefenseRoll < testResult
      ? "fail"
      : previewDefenseRoll === testResult
        ? "normal"
        : previewDefenseRoll >= testResult + 10
          ? "critical"
          : "success";

  const submitResponse = async (previewAction: boolean) => {
    if (isSubmitting || submissionLockRef.current) return;

    submissionLockRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    let submitted = false;
    try {
      await onExecute({
        defenderId: defenderToken.id,
        attribute: selectedAttribute,
        usedMana,
        usedActions,
        usedCertainDie: usedCertaintyDie,
        previewAction,
      });
      submitted = true;
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Não foi possível resolver a defesa.",
      );
    } finally {
      // A tela será desmontada após sucesso. Em caso de erro, liberar para
      // permitir uma nova tentativa sem permitir duplo envio em trânsito.
      if (!submitted) {
        submissionLockRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleConfirm = () => void submitResponse(false);
  const handlePreviewConfirm = () => void submitResponse(true);
  const handleCancel = async () => {
    if (!onCancel || submissionLockRef.current) return;

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onCancel();
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Não foi possível cancelar a defesa.",
      );
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const resultColor =
    resultType === "fail"
      ? "bg-red-500 border-red-600"
      : resultType === "normal"
      ? "bg-yellow-400 border-yellow-500"
      : resultType === "success"
      ? "bg-green-500 border-green-600"
      : resultType === "critical"
      ? "bg-blue-500 border-blue-600"
      : "bg-purple-500 border-purple-600";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-md rounded-lg border-2 border-orange-600 bg-gray-800 p-4 text-gray-100 shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-bold text-orange-500">
              Defesa contra {card.name}
            </h3>
          </div>
          <span className="text-[11px] text-gray-400">
            {defenderToken.name} • Lv {defenderToken.attributes.level}
          </span>
        </div>

        {/* Context */}
        <div className="mb-3 rounded border border-black/50 bg-black/30 p-2">
          <p className="text-xs italic text-gray-400">"{card.causality}"</p>
        </div>

        {/* Result Preview */}
        <div
          className={`mb-4 grid grid-cols-3 gap-2 rounded border-2 p-2 text-center ${resultColor}`}
        >
          <div>
            <p className="text-[11px] uppercase opacity-80">Dano</p>
            <p className="text-lg font-bold">{cardResult}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase opacity-80">Teste</p>
            <p className="text-lg font-bold">{testResult}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase opacity-80">Previsão</p>
            <p className="text-lg font-bold">{previewDefenseRoll}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Attribute */}
          <div>
            <label className="text-xs text-gray-300">Atributo</label>
            <select
              value={selectedAttribute}
              onChange={(e) =>
                setSelectedAttribute(e.target.value as OffensiveCardAttribute)
              }
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm"
            >
              <option value="forca">Força</option>
              <option value="consistencia">Consistência</option>
              <option value="destreza">Destreza</option>
              <option value="inteligencia">Inteligência</option>
              <option value="sabedoria">Sabedoria</option>
              <option value="carisma">Carisma</option>
            </select>
          </div>

          {/* Resources */}
          <div>
            <label className="text-xs text-gray-300">Ações</label>
            <input
              type="number"
              min={1}
              max={availableActions}
              value={usedActions}
              onChange={(e) => setUsedActions(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm"
            />

            <label className="mt-2 block text-xs text-gray-300">Mana</label>
            <input
              type="number"
              min={0}
              max={availableMana}
              value={usedMana}
              onChange={(e) => setUsedMana(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm"
            />
          </div>

          {/* Certainty Die */}
          <div>
            <label className="text-xs text-gray-300">Dado Certo</label>
            <div className="mt-2 flex items-center gap-3 rounded border border-gray-700 bg-gray-900/40 p-2">
              <input
                type="checkbox"
                checked={usedCertaintyDie}
                disabled={availableCertainyDie <= 0}
                onChange={(e) => setUsedCertaintyDie(e.target.checked)}
                className="h-5 w-5 accent-purple-500"
              />
              <span className="text-xs text-gray-200">
                Garantir sucesso total
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {submissionError && (
          <p className="mt-4 text-right text-xs text-red-400">{submissionError}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          {onCancel && (
            <button
              onClick={() => void handleCancel()}
              disabled={isSubmitting}
              className="flex items-center gap-1 rounded px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
            >
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          )}
          {
            defenderTokenPrevActions > 0 && !usedCertaintyDie &&
            (
            <button
                onClick={handlePreviewConfirm}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded bg-pink-600 px-4 py-2 text-sm font-bold hover:bg-pink-700 disabled:cursor-wait disabled:opacity-60"
            >
                <Brain className="h-4 w-4" />
                Prever Card
            </button>
            )
          }
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded bg-orange-600 px-4 py-2 text-sm font-bold hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60"
          >
            <GiDiceTwentyFacesTwenty className="h-4 w-4" />
            Confirmar Defesa
          </button>
        </div>
      </div>
    </div>
  );
};

export default OffensiveCardResolution;
