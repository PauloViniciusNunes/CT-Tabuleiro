import React, { useState, useEffect, useRef } from "react";
import type { Token } from "../../types/token";
import type { ActionChoice } from "../../types/battle";
import { calculateDistance, isInAttackRange, calculateActionRoll } from "../../utils/battleCalculations";
import { Sword, Brain, Book, Zap, Sparkles} from "lucide-react";
import { GiCardRandom} from "react-icons/gi";
import { type Item } from "../../types/item";
import { ChevronDown, ChevronUp } from "lucide-react";


import PANNEL1 from "../../assets/hud/PANNEL1.svg"
import BLUEBUTTOM from "../../assets/buttons/BLUEBUTTOM.svg"
import GRAYBUTTOM from "../../assets/buttons/GRAYBUTTOM.svg"
import LEFTARROW from "../../assets/buttons/LEFTARROW.svg"
import RIGHTARROW from "../../assets/buttons/RIGHTARROW.svg"
import MINIPANNEL1 from "../../assets/hud/MINIPANNEL1.svg"


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
      item: Item | null;
    }
  ) => void;

  onPass: () => void;
  onSelectionTarget: (b: boolean) => void;
  possibleTargets: Token[];
  findedTarget: Token | null;
  isResponseAttack?: (defenderId: string, usedMana: number) => boolean;
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
  isResponseAttack,
  hidePass,
  restrictedMode,
}) => {
  const [selectedAction, setSelectedAction] = useState<AttackAttr | null>("ataque_fisico");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [usedMana, setUsedMana] = useState<number>(0);
  const [usedActions, setUsedActions] = useState<number>(1);
  const [pos, setPos] = useState<number>(1);
  const willBeResponse = selectedTarget ? !!isResponseAttack?.(selectedTarget, usedMana) : false;
  const [displayForm, setDisplayForm] = useState(true);
  const [formPage, setFormPage] = useState<number>(1);

  const equippedItems: Item[] = [
    token.inventory.primaryHand,
    token.inventory.offHand,
    token.inventory.neck,
    token.inventory.ring,
    token.inventory.armor,
  ]
  .filter(Boolean) as Item[];

  const commonItems: Item[] = token.inventory.commonSlot ?? []; // Atualizar, para itens específicos usáveis na mochila
  const availableItems: Item[] = [...equippedItems];

  //Seleção de Ação
  const actionOptions = [
    {
      value: "ataque_fisico",
      label: "Ataque Físico",
      icon: <Sword className="inline-block" />,
      color: "text-red-400",
    },

    ...(!restrictedMode ? [{
      value: "surpreender",
      label: "Surpreender",
      icon: <Zap className="inline-block" />,
      color: "text-yellow-400",
    }] : []),

    ...(!restrictedMode ? [{
      value: "desnortear",
      label: "Desnortear",
      icon: <Book className="inline-block" />,
      color: "text-purple-400",
    }] : []),

    ...(!restrictedMode ? [{
      value: "previnir",
      label: "Previnir",
      icon: <Brain className="inline-block" />,
      color: "text-pink-400",
    }] : []),

    ...(!restrictedMode ? [{
      value: "mana_recover",
      label: "Recarregar",
      icon: <Sparkles className="inline-block" />,
      color: "text-blue-400",
    }] : []),

    ...(!restrictedMode ? [{
      value: "card_selection",
      label: "Cards",
      icon: <GiCardRandom className="inline-block text-xl" />,
      color: "text-orange-400",
    }] : []),
  ];  
  const currentIndex =
    Math.max(
      0,
      actionOptions.findIndex(
        a => a.value === selectedAction
      )
    );  
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
  const [inTargetSelection, setInTargetSelection] = useState(false);

  // Selecionar item
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemCoerentAdd, setItemCoerentAdd] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const itemOcasionalAdd = useRef<number>(0);
  useEffect(() => {
    itemOcasionalAdd.current = (selectedItem?.ocasionalAdd ?? 0);
    const r = selectedAction === "ataque_fisico" ? "forca": (selectedAction === "desnortear" ? "sabedoria": (selectedAction === "previnir" ? "inteligencia" : "destreza"));
    const s = r === selectedItem?.atributeToOcasionalAdd ? true : false;
    setItemCoerentAdd(s);
    console.log(`Adição ocasional do item: ${itemOcasionalAdd.current}`);
  },[selectedItem, selectedAction]);

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

  const hasEnoughActions = usedActions >= 1 && usedActions <= Math.max(1, availableActions);
  const hasEnoughMana = usedMana >= 0 && usedMana <= (token.currentMana ?? 0);
  const isFormValid = !!selectedAction && !!selectedTarget && hasEnoughActions && hasEnoughMana && !!canAttack || selectedAction === "mana_recover" || selectedAction === "card_selection";

  useEffect(() => {
    if (selectedAction === "mana_recover" || selectedAction === "card_selection") {
      setUsedCertaintyDie(false);
      setUsedMana(0);
      setSelectedTarget(null); // desmarca quando fica oculto
    }
  }, [selectedAction]);

  useEffect(() => {

    if(!findedTarget || restrictedMode) return

    const validTarget = findedTarget.team !== token.team && canAttack

    if(!validTarget) return

    if(findedTarget !== null)
    {
      console.debug("Detecta?")
      setSelectedTarget(findedTarget.id)
      setInTargetSelection(false)
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
    setInTargetSelection(true)
    onSelectionTarget(true)
    setDisplayForm(false)
  }

  const handleExecute = () => {
      if (!isFormValid) return;
      
      const allowedCertaintyDie = (selectedAction !== "mana_recover" && selectedAction !== "card_selection")
      if(certaintyLeft > 0 && allowedCertaintyDie && formPage !== 2)
      {
        setFormPage(2);
        return;
      }

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
        actionType: selectedAction,
        item: selectedItem // novo campo
      });


      setUsedCertaintyDie(false);
      setUsedMana(0);
      setUsedActions(1);
      setSelectedAction(null);
      setSelectedTarget(null);

      if(formPage !== 1)
      {
        setFormPage(1);
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

                    <div
                      className={`font-semibold flex items-center gap-2
                        ${actionOptions[currentIndex].color}
                      `}
                    >
                      {actionOptions[currentIndex].icon}
                      {actionOptions[currentIndex].label}
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
                    {selectedAction !== "mana_recover" && selectedAction !== "card_selection" && (
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
                <div>
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
                </div>
              )}




              {/* Botões */}
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2 w-[650px]">

                <button
                  type="button"
                  onClick={handleExecute}
                  className="relative flex-1 py-2 cursor-pointer rounded text-white text-sm font-bold disabled:opacity-50 z-1"
                  disabled={!isFormValid}
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
                      Executar
                    </span>
                </button>

                {!hidePass && (
                  <button
                    type="button"
                    onClick={onPass}
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
                      Passar
                    </span>                        
                  </button>
                )}

              </div>
            </div>
          </div>
          </div>
        )}
        <button
          onClick={() => setDisplayForm(!displayForm)}
          className={`
            fixed bottom-4 left-4 z-50
            p-4 rounded-full
            bg-gray-900 hover:bg-gray-800 text-white
            shadow-lg border border-gray-700
            focus:ring-2 focus:ring-gray-800
            transition-[right,background-color,transform] duration-200
            active:scale-95
          `}
        >
          {displayForm ? (
            <>
              <ChevronUp className="w-5 h-5" />
            </>
          ) : (
            <>
              <ChevronDown className="w-5 h-5" />
              
            </>
          )}
        </button>
    </div>
    
  );
};

export default ActionForm;
