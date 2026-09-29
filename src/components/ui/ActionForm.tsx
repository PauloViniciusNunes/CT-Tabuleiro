import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";
import { isInAttackRange, calculateActionRoll } from "../../utils/battleCalculations";
import { Sword, Brain, Book, Zap, Sparkles, Dices, UsersRound, type LucideIcon } from "lucide-react";
import { type Item } from "../../types/item";
import { BattleFormToggle } from "./BattleFormToggle";
import type { PrimaryMechanic } from "../../types/effects";
import { getTokenMechanicForAction } from "../../utils/tokenMechanics";


import PANNEL1 from "../../assets/hud/PANNEL1.svg"
import BLUEBUTTOM from "../../assets/buttons/BLUEBUTTOM.svg"
import GRAYBUTTOM from "../../assets/buttons/GRAYBUTTOM.svg"
import LEFTARROW from "../../assets/buttons/LEFTARROW.svg"
import RIGHTARROW from "../../assets/buttons/RIGHTARROW.svg"
import MINIPANNEL1 from "../../assets/hud/MINIPANNEL1.svg"


type AttackAttr = "ataque_fisico" | "surpreender" | "desnortear" | "previnir" | "mana_recover" | "card_selection" | "transformar";

type ActionOption = {
  value: AttackAttr;
  label: string;
  icon: LucideIcon;
  color: string;
  restricted?: boolean;
};

const ACTION_OPTIONS: ActionOption[] = [
  { value: "ataque_fisico", label: "Ataque Físico", icon: Sword, color: "text-red-400" },
  { value: "surpreender", label: "Surpreender", icon: Zap, color: "text-yellow-400", restricted: true },
  { value: "desnortear", label: "Desnortear", icon: Book, color: "text-purple-400", restricted: true },
  { value: "previnir", label: "Previnir", icon: Brain, color: "text-pink-400", restricted: true },
  { value: "mana_recover", label: "Recarregar", icon: Sparkles, color: "text-blue-400", restricted: true },
  { value: "card_selection", label: "Cards", icon: Dices, color: "text-orange-400", restricted: true },
  { value: "transformar", label: "Transformar", icon: UsersRound, color: "text-green-400", restricted: true },
];

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
      item: Item | null;
      selectedMechanic: PrimaryMechanic;
    }
  ) => void | Promise<void | { accepted?: boolean }>;

  onPass: () => void | Promise<void>;
  onSelectionTarget: (b: boolean) => void;
  possibleTargets: Token[];
  findedTarget: Token | null;
  hidePass?: boolean; // NOVO: oculta o botão de "pular"
  restrictedMode: boolean;
}

const ActionForm: React.FC<ActionFormProps> = ({
  token,
  availableActions,
  onExecute,
  onSelectionTarget,
  onPass,
  possibleTargets,
  findedTarget,
  hidePass,
  restrictedMode,
}) => {
  const [selectedAction, setSelectedAction] = useState<AttackAttr | null>("ataque_fisico");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [usedMana, setUsedMana] = useState<number>(0);
  const [usedActions, setUsedActions] = useState<number>(1);
  const pos = 1;
  const [displayForm, setDisplayForm] = useState(true);
  const [formPage, setFormPage] = useState<number>(1);
  const availableMechanics = useMemo<PrimaryMechanic[]>(
    () => token.tokenPrimaryElement?.length ? token.tokenPrimaryElement : ["neutro"],
    [token.tokenPrimaryElement],
  );
  const [selectedMechanic, setSelectedMechanic] = useState<PrimaryMechanic>(availableMechanics[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);

  useEffect(() => {
    if (!availableMechanics.includes(selectedMechanic)) {
      setSelectedMechanic(availableMechanics[0]);
    }
  }, [availableMechanics, selectedMechanic]);

  const equippedItems: Item[] = [
    token.inventory.primaryHand,
    token.inventory.offHand,
    token.inventory.neck,
    token.inventory.ring,
    token.inventory.armor,
  ]
  .filter(Boolean) as Item[];

  const availableItems: Item[] = [...equippedItems];

  // Seleção de ação
  const actionOptions = useMemo(
    () => ACTION_OPTIONS.filter((option) => !restrictedMode || !option.restricted),
    [restrictedMode],
  );
  const currentIndex =
    Math.max(
      0,
      actionOptions.findIndex(
        a => a.value === selectedAction
      )
    );
  const currentAction = actionOptions[currentIndex] ?? actionOptions[0];

  useEffect(() => {
    if (selectedAction && !actionOptions.some((option) => option.value === selectedAction)) {
      setSelectedAction(actionOptions[0]?.value ?? null);
    }
  }, [actionOptions, selectedAction]);
  const CurrentActionIcon = currentAction.icon;

  function nextAction()
  {
    const next =
      (currentIndex + 1) %
      actionOptions.length;

    setSelectedAction(
      actionOptions[next].value as AttackAttr
    );
  }

  function prevAction()
  {
    const prev =
      (currentIndex - 1 + actionOptions.length) %
      actionOptions.length;

    setSelectedAction(
      actionOptions[prev].value as AttackAttr
    );
  }  

  // Seleção de alvo
  // Selecionar item
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Dado Certo
  const [usedCertaintyDie, setUsedCertaintyDie] = useState<boolean>(false);
  const certaintyLeft = token.certaintyDiceRemaining ?? 0;

  const targetToken = selectedTarget
    ? possibleTargets.find((t) => t.id === selectedTarget) ?? null
    : null;

  const isPhysicalAttack = !!selectedAction && (selectedAction === "ataque_fisico" || selectedAction === "surpreender");
  const isMagicalAttack  = !!selectedAction && (selectedAction === "desnortear" || selectedAction === "previnir")
  const canAttack = !targetToken || (isPhysicalAttack && isInAttackRange(token, targetToken, "fisico")) || (isMagicalAttack && isInAttackRange(token, targetToken, "magico"));
  const hasEnoughActions = usedActions >= 1 && usedActions <= Math.max(1, availableActions);
  const hasEnoughMana = usedMana >= 0 && usedMana <= (token.currentMana ?? 0);
  const isUtilityAction = selectedAction === "mana_recover" ||
    selectedAction === "card_selection" || selectedAction === "transformar";
  const isFormValid = isUtilityAction || (
    !!selectedAction && !!selectedTarget && hasEnoughActions &&
    hasEnoughMana && !!canAttack
  );

  useEffect(() => {
    if (isUtilityAction) {
      setUsedCertaintyDie(false);
      setUsedMana(0);
      setSelectedTarget(null); // desmarca quando fica oculto
    }
  }, [selectedAction, isUtilityAction]);

  useEffect(() => {

    if(!findedTarget || restrictedMode) return

    const validTarget = findedTarget.team !== token.team && canAttack

    if(!validTarget) return

    if(findedTarget !== null)
    {
      console.debug("Detecta?")
      setSelectedTarget(findedTarget.id)
      setDisplayForm(true)
    }
  }, [findedTarget])

  useEffect(() => {
    if(restrictedMode)
    {
      setSelectedTarget(possibleTargets[0].id)
      setSelectedAction("ataque_fisico")
    }
  }, [restrictedMode, selectedTarget])

  const openTargetSelection = () =>
  {
    onSelectionTarget(true)
    setDisplayForm(false)
  }

  const handleExecute = async () => {
      if (!isFormValid || submissionLockRef.current) return;
      
      const allowedCertaintyDie = !isUtilityAction
      const needsMechanicChoice = usedMana > 0 && availableMechanics.length > 1;
      const hasSecondPageOptions = allowedCertaintyDie &&
        (certaintyLeft > 0 || needsMechanicChoice);

      if(hasSecondPageOptions && formPage !== 2)
      {
        setFormPage(2);
        return;
      }

      const respectiveAtribute = selectedAction === "ataque_fisico" ? "forca": (selectedAction === "desnortear" ? "sabedoria": (selectedAction === "previnir" ? "inteligencia" : "destreza"));
    
      const params = {
        tokenId: token.id,
        usedItemId: selectedItem?.id,
        Q: usedActions,
        P: pos,
        A: token.attributes[respectiveAtribute!],
        PF: token.proficiencies[respectiveAtribute!] ? Math.ceil((token.attributes.level - 10) / 4 + 4) : 0,
        O: 0,
        N: usedMana > 0 ? 1 : 0,
        L: token.attributes.level,
        M: usedMana,
      };
      const rollResult = calculateActionRoll(params);

      const actionType = selectedAction === "ataque_fisico" ? "Ataque Físico"
        : selectedAction === "desnortear" ? "Desnortear"
        : selectedAction === "previnir" ? "Previnir"
        : selectedAction === "surpreender" ? "Surpreender"
        : selectedAction === "mana_recover" ? "Recarga de Mana"
        : selectedAction === "transformar" ? "Transformar"
        : "Seleção de Card";

      submissionLockRef.current = true;
      setIsSubmitting(true);
      try {
        const execution = await onExecute({
          attribute: respectiveAtribute!,
          type: actionType,
          targetId: selectedTarget!,
          usedMana,
          usedActions,
          usedCertaintyDie,
          pos,
          rollResult,
          actionType: selectedAction,
          item: selectedItem,
          selectedMechanic: getTokenMechanicForAction(
            availableMechanics,
            selectedMechanic,
            usedMana,
          ),
        });
        if (execution?.accepted === false) {
          submissionLockRef.current = false;
          setIsSubmitting(false);
          return;
        }

        setUsedCertaintyDie(false);
        setUsedMana(0);
        setUsedActions(1);
        setSelectedAction(null);
        setSelectedTarget(null);
        if(formPage !== 1) setFormPage(1);
      } catch (error) {
        console.error("Não foi possível executar a ação:", error);
        submissionLockRef.current = false;
        setIsSubmitting(false);
      }

    };

  const handlePass = async () => {
    if (submissionLockRef.current) return;

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onPass();
    } catch (error) {
      console.error("Não foi possível passar o turno:", error);
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }
  };


  return (
    <div>  
        {displayForm && ( 
          <div className={`fixed inset-0 flex items-center justify-center backdrop-blur-md`}>
              <img
              src={PANNEL1}
              alt=""
              className="
                absolute
                inset-0
                w-[750px]
                left-1/2 -translate-x-1/2
                top-1/2 -translate-y-1/2
                object-fill
                pointer-events-none
                z-0
              "
            />
          <div className="relative w-[650px] h-[500px]">
            <div className="flex flex-col gap-3">
              
              <div className="flex items-center justify-center text-sm text-gray-300 w-full mb-4 z-1">
                <div className="flex items-center">
                  <span className="font-semibold text-lg">
                    {restrictedMode ? `RESP. DE ${token.name.toUpperCase()}` : `TURNO DE ${token.name.toUpperCase()}`}
                  </span>
                </div>
              </div>
              {formPage === 1 && (
                <div className="absolute p-0 m-0 w-[90%] left-1/2 -translate-x-1/2 translate-y-1/3">
                  
                  <div className="text-lm font-semibold z-1">
                    <p className="text-blue-500">Tipo de Ação</p>
                  </div>
                  <div className="flex items-center justify-between bg-black/50 border border-cyan-600 rounded-lg px-4 py-3 z-1 mb-4">

                    <button
                      type="button"
                      onClick={prevAction}
                      className="relative w-[20px] h-[20px] text-gray-400 hover:text-white text-xl"
                    >
                      <img
                          src={LEFTARROW}
                          alt=""
                          className="
                            absolute
                            inset-0
                            w-full
                            scale-180
                            object-fill
                            pointer-events-none
                            z-5
                          "
                        />   
                                          
                    </button>

                    <div className="min-w-0 flex-1 text-center" translate="no">
                      <span
                        key={currentAction.value}
                        className={"notranslate inline-flex items-center gap-2 font-semibold " + currentAction.color}
                      >
                        <CurrentActionIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span>{currentAction.label}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={nextAction}
                      className="relative w-[20px] h-[20px] text-gray-400 hover:text-white text-xl"
                    >
                      <img
                          src={RIGHTARROW}
                          alt=""
                          className="
                            absolute
                            inset-0
                            w-full
                            scale-180
                            object-fill
                            pointer-events-none
                            z-5
                          "
                        />                        
                    </button>

                  </div>

                  <div className="text-lm font-semibold p-0 z-10 mb-3">
                    <p className="text-blue-500">Estatísticas</p>
                  </div>                          
                  {/* Estatísticas */}
                  <div className="relative grid grid-cols-2 gap-2 items-start rounded-lg p-2 z-1">
                    {/* Ações Usadas */}
                      <img
                          src={MINIPANNEL1}
                          alt=""
                          className="
                            absolute
                            inset-0
                            w-full
                            scale-105
                            -translate-y-4
                            object-fill
                            pointer-events-none
                            z-5
                          "
                        />                
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
                            : "bg-black/70 border-gray-600 text-white"
                        }`}
                      />
                    </div>                    
                    
                    {/* Seleção de Alvo + Indicador de Distância */}
                    {/* */}
                    {/* Seleção de alvos atualizada */}
                    {!isUtilityAction && (
                      <div className="flex flex-col gap-1">
                        <label className="block text-xs text-gray-400">Alvo</label>
                          <button
                            onClick={() => openTargetSelection()}
                            disabled={restrictedMode}
                            className={`w-full p-2 rounded bg-black/70 text-white border border-gray-600 focus:border-blue-400 focus:outline-none text-sm
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {restrictedMode
                              ? `${targetToken?.name}`
                              : selectedTarget
                              ? `${findedTarget?.name}`
                              : `Nenhum alvo`}
                          </button>
                      </div>
                    )}

                    {/* Mana Usada */}
                    {!isUtilityAction &&  (
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
                            : "bg-black/70 border-gray-600 text-white"
                        }`}
                      />
                    </div>
                    )}

                    {/* Item */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Item 
                      </label>

                      <div className="relative">

                        <button
                          type="button"
                          onClick={() => setIsOpen(prev => !prev)}
                          className="w-full p-1.5 rounded bg-black/70 border border-gray-600 text-center"
                        >
                          {selectedItem
                            ? selectedItem.name
                            : (
                              <span className="text-gray-400 italic">
                                Nenhum item
                              </span>
                            )
                          }
                        </button>

                        {isOpen && (
                          <div className="absolute z-50 mt-1 w-full rounded bg-gray-800 border border-gray-700 shadow-lg max-h-60 overflow-y-auto">

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(null);
                                setIsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-gray-400 italic hover:bg-gray-700"
                            >
                              Nenhum item
                            </button>

                            {availableItems.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                              >
                                {item.name}
                              </button>
                            ))}

                          </div>
                        )}

                      </div>
                    </div>


                  </div>                  
                </div>
              )}
              {formPage === 2 && (
                <div className="absolute p-0 m-0 w-[90%] left-1/2 -translate-x-1/2 translate-y-1/3 space-y-4">
                  {usedMana > 0 && availableMechanics.length > 1 && (
                    <div className="rounded-lg border border-cyan-700 bg-black/50 p-3">
                      <p className="mb-2 text-sm font-semibold text-cyan-400">
                        Mecânica da mana
                      </p>
                      <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                        {availableMechanics.map((mechanic) => (
                          <button
                            key={mechanic}
                            type="button"
                            onClick={() => setSelectedMechanic(mechanic)}
                            className={`rounded border px-2 py-2 text-xs capitalize transition-colors ${
                              selectedMechanic === mechanic
                                ? "border-cyan-300 bg-cyan-700 text-white"
                                : "border-gray-600 bg-gray-900/80 text-gray-300 hover:border-cyan-600"
                            }`}
                          >
                            {mechanic.replaceAll("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dado Certo */}
                  {!isUtilityAction && certaintyLeft > 0 && (
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
                </div>
              )}




              {/* Botões */}
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2 w-[650px]">

                <button
                  type="button"
                  onClick={handleExecute}
                  className="relative flex-1 py-2 cursor-pointer rounded text-white text-sm font-bold disabled:opacity-50 z-1"
                  disabled={!isFormValid || isSubmitting}
                >
                  <img
                      src={BLUEBUTTOM}
                      alt=""
                      className="
                        absolute
                        inset-0
                        w-full
                        h-full
                        scale-180
                        object-fill
                        pointer-events-none
                      "
                    />

                    <span
                      className="
                        relative
                        z-10
                        flex
                        items-center
                        justify-center
                        h-full
                        text-white
                        font-bold
                        text-sm
                      "
                    >
                      {isSubmitting ? "Processando..." : "Executar"}
                    </span>
                </button>

                {!hidePass && (
                  <button
                    type="button"
                    onClick={handlePass}
                    disabled={isSubmitting}
                    className="relative flex-1 py-2 rounded text-white text-sm font-bold z-1"
                  >
                  <img
                      src={GRAYBUTTOM}
                      alt=""
                      className="
                        absolute
                        inset-0
                        w-full
                        h-full
                        scale-180
                        object-fill
                        pointer-events-none
                      "
                    />

                    <span
                      className="
                        relative
                        z-10
                        flex
                        items-center
                        justify-center
                        h-full
                        text-white
                        font-bold
                        text-sm
                      "
                    >
                      {isSubmitting ? "Processando..." : "Passar"}
                    </span>                        
                  </button>
                )}

              </div>
            </div>
          </div>
          </div>
        )}
        <BattleFormToggle
          visible={displayForm}
          onToggle={() => setDisplayForm((visible) => !visible)}
          label="formulário de ação"
        />
    </div>
    
  );
};

export default ActionForm;
