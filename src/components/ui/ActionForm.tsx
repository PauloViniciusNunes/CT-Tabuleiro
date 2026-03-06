import React, { useState, useEffect } from "react";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";
import { calculateDistance, isInAttackRange, calculateActionRoll } from "../../utils/battleCalculations";
import { Swords, Sword, Brain, Book, Zap, Sparkles} from "lucide-react";
import { GiDiceTwentyFacesTwenty, GiCardRandom} from "react-icons/gi";


type AttackAttr = "ataque_fisico" | "surpreender" | "desnortear" | "previnir" | "mana_recover" | "card_selection";

interface ActionFormProps {
  token: Token;
  availableActions: number;
  onExecute: (
    choice: ActionChoice & {
      targetId: string;
      usedMana: number;
      usedActions: number;
      usedCertaintyDie?: boolean;
      pos: number;
      actionType: string;
    }
  ) => void;

  onPass: () => void;
  possibleTargets: Token[];
  isResponseAttack?: (defenderId: string, usedMana: number) => boolean;
  hidePass?: boolean; // NOVO: oculta o botão de "pular"
  restrictedMode: boolean;
}

const ActionForm: React.FC<ActionFormProps> = ({
  token,
  availableActions,
  onExecute,
  onPass,
  possibleTargets,
  isResponseAttack,
  hidePass,
  restrictedMode
}) => {
  const [selectedAction, setSelectedAction] = useState<AttackAttr | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [usedMana, setUsedMana] = useState<number>(0);
  const [usedActions, setUsedActions] = useState<number>(1);
  const [pos, setPos] = useState<number>(1);
  const willBeResponse = selectedTarget ? !!isResponseAttack?.(selectedTarget, usedMana) : false;

  // Dado Certo
  const [usedCertaintyDie, setUsedCertaintyDie] = useState<boolean>(false);
  const certaintyLeft = token.certaintyDiceRemaining ?? 0;

  const targetToken = selectedTarget
    ? possibleTargets.find((t) => t.id === selectedTarget) ?? null
    : null;

  const isPhysicalAttack = !!selectedAction && (selectedAction === "ataque_fisico" || selectedAction === "surpreender");
  const isMagicalAttack  = !!selectedAction && (selectedAction === "desnortear" || selectedAction === "previnir")
  const canAttack = !targetToken || (isPhysicalAttack && isInAttackRange(token, targetToken, "fisico")) || (isMagicalAttack && isInAttackRange(token, targetToken, "magico"));
  const distance = targetToken ? calculateDistance(token, targetToken) : 0;
  const maxRange = isPhysicalAttack ? token.bodytobodyRange : token.magicalRange;

  const hasEnoughActions =
    usedActions >= 1 && usedActions <= Math.max(1, availableActions);
  const hasEnoughMana = usedMana >= 0 && usedMana <= (token.currentMana ?? 0);
  const isFormValid =
    !!selectedAction && !!selectedTarget && hasEnoughActions && hasEnoughMana && !!canAttack || selectedAction === "mana_recover" || selectedAction === "card_selection";

    useEffect(() => {
  if (selectedAction === "mana_recover" || selectedAction === "card_selection") {
    setUsedCertaintyDie(false);
    setUsedMana(0);
    setSelectedTarget(null); // desmarca quando fica oculto
  }
}, [selectedAction]);
  const handleExecute = () => {
    if (!isFormValid) return;

    const respectiveAtribute = selectedAction === "ataque_fisico" ? "forca": (selectedAction === "desnortear" ? "sabedoria": (selectedAction === "previnir" ? "inteligencia" : "destreza"));

    const params = {
      tokenId: token.id,
      Q: usedActions,
      P: pos,
      A: token.attributes[respectiveAtribute!],
      PF: token.proficiencies[respectiveAtribute!] ? Math.ceil((token.attributes.level - 10) / 4 + 4) : 0,
      O: 0,
      N: usedMana > 0 ? 1 : 0,
      L: token.attributes.level,
      M: usedMana,
    };
    const rollResult = calculateActionRoll(params) as any; // garante o shape esperado de RollResult

    const actionType = selectedAction === "ataque_fisico" ? "Ataque Físico": (selectedAction === "desnortear" ? "Desnortear": (selectedAction === "previnir" ? "Previnir" : (selectedAction === "surpreender" ? "Surpreender" : (selectedAction === "mana_recover" ? "Recarga de Mana" : "Seleção de Card"))));

    onExecute({
      attribute: respectiveAtribute!,
      type: actionType,
      targetId: selectedTarget!,
      usedMana,
      usedActions,
      usedCertaintyDie,
      pos,
      rollResult,
      actionType: selectedAction
    });

    setUsedCertaintyDie(false);
    setUsedMana(0);
    setUsedActions(1);
    setSelectedAction(null);
    setSelectedTarget(null);
  };


  return (
    <div  className={`rounded-lg bg-gray-900/90 border p-4 shadow-xl ${
      willBeResponse ? "border-red-600" : "border-gray-700"
    }`}>
      <div className="flex flex-col gap-3">
        
        <div className="text-sm text-gray-300">
          <Swords className="inline-block align-middle h-5 w-5 text-red-500 mr-1" /><span>Ação de <span className="text-white font-semibold">{token.name}</span></span> 
        </div>

        {/* Seleção de Ação */}
        <div className="text-xs text-gray-400">Tipo de Ações</div>
        <div className="grid grid-cols-2 gap-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedAction("ataque_fisico")}
            className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
              selectedAction === "ataque_fisico"
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >

            <Sword className={`gap-2 inline-block ${selectedAction === "ataque_fisico" ? "text-white-600" : "text-red-600"}`}/> Ataque Físico
          </button>
          {((!restrictedMode)) && (
            <button
              type="button"
              onClick={() => setSelectedAction("surpreender")}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
                selectedAction === "surpreender"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Zap className={`gap-2 inline-block hover ${selectedAction === "surpreender" ? "text-white-600" : "text-yellow-600"}`}/> Surpreender
            </button>
          )}
          {(!restrictedMode) && (
            <button
              type="button"
              onClick={() => setSelectedAction("desnortear")}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
                selectedAction === "desnortear"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Book className={`gap-2 inline-block ${selectedAction === "desnortear" ? "text-white-600" : "text-purple-600"}`}/> Desnortear
            </button>
          )}
          {(!restrictedMode) && (
            <button
              type="button"
              onClick={() => setSelectedAction("previnir")}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
                selectedAction === "previnir"
                  ? "bg-pink-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Brain className={`gap-2 inline-block ${selectedAction === "previnir" ? "text-white-600" : "text-pink-500"}`}/> Previnir
            </button> 
          )}
          {(!restrictedMode) && (
            <button
              type="button"
              onClick={() => setSelectedAction("mana_recover")}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
                selectedAction === "mana_recover"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Sparkles className={`gap-2 inline-block ${selectedAction === "mana_recover" ? "text-white-600" : "text-blue-500"}`}/> Recarregar
            </button> 
          )}
          {(!restrictedMode) && (
            <button
              type="button"
              onClick={() => setSelectedAction("card_selection")}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition-colors ${
                selectedAction === "card_selection"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <GiCardRandom className={`gap-2 inline-block text-2xl ${selectedAction === "card_selection" ? "text-white-600" : "text-orange-500"}`}/> Cards
            </button> 
          )}                      
                 
        </div>

        {/* Seleção de Alvo */}
        {selectedAction !== "mana_recover" && selectedAction !== "card_selection" &&(
        <div>
          <label className="block text-xs text-gray-400 mb-1">Alvo</label>
          <select
            value={selectedTarget ?? ""}
            onChange={(e) => setSelectedTarget(e.target.value || null)}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-400 focus:outline-none text-sm"
          >
            <option value="">Selecione um alvo</option>
            {possibleTargets.filter(t => t.team !== token.team).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        )}
        {/* Indicador de Distância */}
        {targetToken && selectedAction !== "mana_recover" &&(
          <div className="text-xs">
            {canAttack
              ? `✓ Distância: ${distance} célula(s) (Alcance: ${maxRange})`
              : `✗ Fora do alcance! Distância: ${distance}, Alcance: ${maxRange}`}
          </div>
        )}

        {/* Ações Usadas */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Ações Usadas (Disponível: {availableActions})
          </label>
          <input
            type="number"
            min={1}
            max={Math.max(1, availableActions)}
            value={usedActions}
            onChange={(e) =>
              setUsedActions(
                Math.max(1, Math.min(Math.max(1, availableActions), Number(e.target.value)))
              )
            }
            className={`w-full p-2 rounded border focus:outline-none text-sm ${
              !hasEnoughActions
                ? "bg-red-900 border-red-600 text-red-100"
                : "bg-gray-700 border-gray-600 text-white"
            }`}
          />
        </div>

        {/* Mana Usada */}
        {selectedAction !== "mana_recover" && selectedAction !== "card_selection" &&  (
        <div>
          <label className="block text-xs text-gray-400 mb-1">
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
        )}
        {/* Dado Certo */}
        {selectedAction !== "mana_recover" && selectedAction !== "card_selection" && (
        <div className="flex items-center justify-between bg-gray-800/60 rounded p-2">
          <label htmlFor="use-certainty" className="text-sm text-gray-200 flex items-center gap-2">
            <input
              id="use-certainty"
              type="checkbox"
              className="h-4 w-4"
              disabled={certaintyLeft <= 0}
              checked={usedCertaintyDie}
              onChange={(e) => setUsedCertaintyDie(e.target.checked)}
            />
            Usar Dado Certo
          </label>
          <span className="text-xs text-gray-400">Restantes: {certaintyLeft}</span>
        </div>
        )}
        {/* Botões */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExecute}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 cursor-pointer rounded text-white text-sm font-bold disabled:opacity-50"
            disabled={!isFormValid}
          >
            <GiDiceTwentyFacesTwenty className="gap-2 inline-block"/> 
            {selectedAction === "card_selection" &&(
              <p className="inline-block"> Selecionar</p>
                
            )
            }
            {selectedAction !== "card_selection" &&(
              <div className="inline-block">
                Executar
              </div>
            )
            }
          </button>
          {!hidePass && (
            <button type="button" onClick={onPass}className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm" >
              Passar
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default ActionForm;
