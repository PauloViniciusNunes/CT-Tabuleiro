import React, { useState, useEffect } from "react";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";
import type { TokenAttributes } from "../../types/token";

interface ActionFormProps {
  token: Token;
  availableActions: number;
  onExecute: (choice: ActionChoice) => void;
  onPass: () => void;
}

type AttributeKey = keyof Omit<TokenAttributes, "level" | "xp">;

const attributeActions: Record<AttributeKey, string[]> = {
  forca: ["Ataque físico"],
  destreza: ["Surpreender", "Disparar"],
  consistencia: [],
  inteligencia: ["Prever"],
  sabedoria: ["Desnortear"],
  carisma: [],
};

const ActionForm: React.FC<ActionFormProps> = ({ token, availableActions, onExecute, onPass }) => {
  const [attribute, setAttribute] = useState<AttributeKey>("forca");
  const [actionType, setActionType] = useState<string>(attributeActions.forca[0]);

  useEffect(() => {
    const options = attributeActions[attribute];
    setActionType(options[0] || "");
  }, [attribute]);

  const handleExecute = () => {
    onExecute({ attribute, type: actionType, rollResult: undefined! });
  };

  return (
    <div className="w-64 bg-gray-800 p-4 rounded shadow-md text-white">
      <h3 className="font-semibold mb-2">
        {token.name} – Ações restantes: {availableActions}
      </h3>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col">
          Atributo:
          <select
            value={attribute}
            onChange={(e) => setAttribute(e.target.value as AttributeKey)}
            className="mt-1 p-1 rounded bg-gray-700"
          >
            {Object.entries(attributeActions).map(([key, opts]) =>
              opts.length > 0 ? <option key={key} value={key}>{key}</option> : null
            )}
          </select>
        </label>
        <label className="flex flex-col">
          Ação:
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="mt-1 p-1 rounded bg-gray-700"
          >
            {attributeActions[attribute].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={onPass}
            className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
          >
            Passar
          </button>
          <button
            type="button"
            onClick={handleExecute}
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
          >
            Executar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionForm;
