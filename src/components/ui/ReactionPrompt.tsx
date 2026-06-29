// /src/components/ui/ReactionPrompt.tsx
import React, { useEffect, useMemo, useState } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Switch from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { Shield, Zap, XCircle, Brain, Book, CardSim, Sparkles } from "lucide-react";
import { GiCardRandom } from "react-icons/gi";
import { ChevronUp, ChevronDown } from "lucide-react";
import { GiDiceTwentyFacesTwenty } from "react-icons/gi";
import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";
import { calculateMedianRoll } from "../../utils/battleCalculations";

import LEFTARROW from "../../assets/buttons/LEFTARROW.svg"
import RIGHTARROW from "../../assets/buttons/RIGHTARROW.svg"
import PANNEL2 from "../../assets/hud/PANNEL2.svg"

import { type ResultType } from "../../utils/battleCalculations";
import { type Item } from "../../types/item";
import {
  calculateActionRoll,
} from "../../utils/battleCalculations";
import type { Card } from "../../types/card";

type ReactionAttr = "destreza" | "consistencia" | "inteligencia" | "sabedoria" | "card";

type ActorLike = Token & { reactionType: ReactionAttr };

export interface ReactionPromptProps {
  // Forma nova (normalizada)
  defenderName?: string;
  diretionalActionType?: string;
  diretionalActionValue?: number;
  attackerId?: string;
  availableActions: number;
  availableMana?: number;
  certaintyDieCharges?: number;
  tokenCards: Card[] | undefined;
  isLoading?: boolean;
  onConfirm?: (payload: {
    attribute: ReactionAttr;
    usedActions: number;
    usedMana: number;
    usedCertaintyDie?: boolean;
  }) => void;

  // Forma legada (compatível com BoardPage atual)
  actor?: ActorLike;
  onReact?: (
    actorId: string,
    reactionType: ReactionAttr,
    usedMana: number,
    usedActions: number,
    usedCertaintyDie?: boolean,
    roll?: number | RollResult,
    item?: Item | null,
  ) => void;

  // Paralisia/lock
  isReactionAllowed?: boolean | undefined;
  disabledReason?: string;
  onSkip?: () => void;
  prevActions: number;

  // Cancelar (tomar o golpe)
  onCancel: () => void;
  onPrev: () => void;
}

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-purple-400 focus:ring-offset-gray-900",
        ghost:
          "bg-transparent text-gray-200 hover:bg-gray-700/50 focus:ring-gray-400 focus:ring-offset-gray-900",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 focus:ring-offset-gray-900",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const attributeDescriptions: Record<string, string> = {
  destreza: "Esquiva: teste binário para desviar completamente do dano.",
  consistencia: "Defesa: reduz o dano recebido ao comparar com Força ou Sabedoria.",
  inteligencia: "Leitura tática: testa se você antecipa ou não o movimento adversário.",
  sabedoria: "Resistência mental: evita que suas ações sejam entregues ao adversário (Desnortear).",
};

const reactionOptionsByActionType: Record<string, ReactionAttr[]> = {
  destreza: ["destreza", "card"],
  forca: ["destreza", "consistencia", "card"],
  inteligencia: ["inteligencia", "card"],
  sabedoria: ["sabedoria", "card"],
};

const radioOptions = {
  destreza: {
    title: "Destreza",
    description: "Esquiva binária. Se vencer a Definição, evita todo dano.",
    icon: <Zap className="h-4 w-4 text-yellow-300" />,
  },
  consistencia: {
    title: "Consistência",
    description: "Defesa que reduz o dano recebido ao comparar com Força/Sabedoria.",
    icon: <Shield className="h-4 w-4 text-cyan-300" />,
  },
  inteligencia: {
    title: "Inteligência",
    description: "Teste para determinar se o adversário vai prever suas próximas ações.",
    icon: <Brain className="h-4 w-4 text-pink-500" />,
  },
  sabedoria: {
    title: "Sabedoria",
    description:
      "Teste contra Desnortear. Se falhar, suas ações são entregues ao adversário.",
    icon: <Book className="h-4 w-4 text-purple-500" />,
  },
  card: {
    title: "Card",
    description: "Utilizar uma habilidade especial para se defender.",
    icon: <CardSim className="h-4 w-4 text-orange-500" />
  }
} as const;



type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={[buttonVariants({ variant, size }), className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
});

const fieldLabel =
  "block text-xs text-gray-400 mb-1";
const inputBase =
  "w-full rounded border p-2 text-sm focus:outline-none focus:ring-1 transition-colors";
const inputOk = "bg-black/70 border-black text-white focus:ring-purple-400";
const inputError = "bg-red-900 border-red-600 text-red-100 focus:ring-red-400";
const hint = "mt-1 text-[11px] leading-snug text-gray-400";
const warn = "mt-1 text-[11px] leading-snug text-amber-300";

const ReactionPrompt: React.FC<ReactionPromptProps> = (props) => {
  const {
    // normalizado ou legado
    defenderName,
    attackerId,
    diretionalActionType,
    tokenCards,
    diretionalActionValue,
    availableActions,
    availableMana,
    certaintyDieCharges = 0,
    isLoading = false,
    onConfirm,

    actor,
    onReact,

    isReactionAllowed = true,
    disabledReason,
    prevActions,
    onSkip,

    onCancel,
    onPrev
  } = props;

  // Auto-skip se bloqueado por Paralisia/lock

  const [displayForm, setDisplayForm] = useState(true);
  const [previewDefenseRoll, setPreviewDefenseRoll] = useState<number>(0);
  const [resultType, setResultType] = useState<ResultType>("fail");
  const tokenProficiency = Math.ceil(
    ((actor?.attributes.level ?? 0) - 10) / 4 + 4
  );

  useEffect(() => {
    if (!isReactionAllowed && onSkip) onSkip();
  }, [isReactionAllowed, onSkip]);

  // Deriva dados quando vier "actor"
  const resolvedName = actor?.name ?? defenderName ?? "Defensor";
  const resolvedAvailableMana = actor?.currentMana ?? availableMana ?? 0;
  const resolvedCertainty =
    actor?.certaintyDiceRemaining ?? certaintyDieCharges ?? 0;
  const haveDefenseCards: boolean = ((tokenCards?.filter((c) => c.causalityType === "Defensive"))?.length ?? 0) > 0

  // Estado local
  const [selectedAttribute, setSelectedAttribute] =
    useState<ReactionAttr | null>(actor?.reactionType ?? null);
  const [usedActions, setUsedActions] = useState<number>(1);
  const [usedMana, setUsedMana] = useState<number>(0);
  const [useCertaintyDie, setUseCertaintyDie] = useState<boolean>(false);

  const actionOptions = [
    {
      value: "destreza",
      label: "Destreza",
      icon: <Zap className="inline-block" />,
      color: "text-yellow-400",
    },

    {
      value: "consistencia",
      label: "Consistência",
      icon: <Shield className="inline-block" />,
      color: "text-cyan-500",
    },

    {
      value: "sabedoria",
      label: "Desnortear",
      icon: <Book className="inline-block" />,
      color: "text-purple-400",
    },
    {
      value: "inteligencia",
      label: "Previnir",
      icon: <Brain className="inline-block" />,
      color: "text-pink-400",
    },
    {
      value: "card",
      label: "Cards",
      icon: <GiCardRandom className="inline-block text-xl" />,
      color: "text-orange-400",
    },
  ];  


  useEffect(() =>
  {
    if(selectedAttribute === "card")
    {
      setResultType("total");
      return;
    }

    const preview = calculateMedianRoll(
      usedActions, 
      usedMana, 
      1,
      tokenProficiency,
      actor?.attributes[selectedAttribute ?? "consistencia"],
      itemCoerentAdd ? (selectedItem?.ocasionalAdd ?? 0) : 0
    );

    setPreviewDefenseRoll(preview);

    if (useCertaintyDie) setResultType("total");
    else if (preview < (diretionalActionValue ?? 0)) setResultType("fail");
    else if (preview === diretionalActionValue) setResultType("normal");
    else if (preview >= (diretionalActionValue ?? 0) + 10) setResultType("critical");
    else setResultType("success");

    
  }, [useCertaintyDie, usedActions, usedMana, selectedAttribute]);

  const equippedItems: Item[] = [
    actor?.inventory.primaryHand,
    actor?.inventory.offHand,
    actor?.inventory.neck,
    actor?.inventory.ring,
    actor?.inventory.armor,
  ]
    .filter(Boolean) as Item[];

  const commonItems: Item[] = actor?.inventory.commonSlot ?? []; // Atualizar, para itens específicos usáveis na mochila
  const availableItems: Item[] = [...equippedItems];

  // Selecionar item
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemCoerentAdd, setItemCoerentAdd] = useState<boolean>(false);
  useEffect(() => {
    const r = selectedAttribute;
    const s = r === selectedItem?.atributeToOcasionalAdd ? true : false;
    setItemCoerentAdd(s);
  }, [selectedItem, selectedAttribute]);

  const maxAvailableActions = useMemo(
    () => Math.max(1, availableActions),
    [availableActions]
  );
  const hasEnoughMana = usedMana <= Math.max(0, resolvedAvailableMana);
  const hasEnoughActions =
    usedActions >= 1 && usedActions <= Math.max(1, maxAvailableActions);
  const canUseCertaintyDie = resolvedCertainty > 0;

  const reactionTypeLabel =
    selectedAttribute === "consistencia"
      ? "Consistência"
      : selectedAttribute === "destreza"
        ? "Destreza"
        : selectedAttribute === "sabedoria"
          ? "Sabedoria"
          : "Inteligência";


  const allowedOptions = reactionOptionsByActionType[diretionalActionType ?? ""] ?? [];

  const filteredOptions = actionOptions.filter((a) => allowedOptions.includes(a.value as ReactionAttr))
  const currentIndex =
    Math.max(
      0,
      filteredOptions.findIndex(
        a => a.value === selectedAttribute
      )
    );  

  function nextAction()
  {
    const next =
      (currentIndex + 1) %
      filteredOptions.length;

    setSelectedAttribute(
      filteredOptions[next].value as ReactionAttr
    );
  }

  function prevAction()
  {
    const prev =
      (currentIndex - 1 + filteredOptions.length) %
      filteredOptions.length;

    setSelectedAttribute(
      filteredOptions[prev].value as ReactionAttr
    );
  }  

  useEffect(() => {
    // Se não há nenhuma opção válida → limpa
    if (allowedOptions.length === 0) {
      setSelectedAttribute(null);
      return;
    }

    // Se o selecionado atual é inválido → limpa
    if (selectedAttribute && !allowedOptions.includes(selectedAttribute)) {
      setSelectedAttribute(null);
      return;
    }

    // Se só existe uma opção → seleciona automaticamente
    if (!selectedAttribute && allowedOptions.length === 1) {
      setSelectedAttribute(allowedOptions[0]);
      return;
    }
  }, [allowedOptions]);


  if (!isReactionAllowed) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 rounded-md border border-amber-500 bg-amber-900/30 p-3 text-amber-200 text-sm">
          {disabledReason ?? "Sem Reaction Prompt para este ataque."}
        </div>
      </div>
    );
  }

  function handleConfirm() {
    if (!selectedAttribute) return;
    if (!hasEnoughActions || !hasEnoughMana) return;
    if (useCertaintyDie && !canUseCertaintyDie) return;
    console.info("Selected Attribute: ", selectedAttribute)

    // Preferência: forma nova
    if (onConfirm) {
      onConfirm({
        attribute: selectedAttribute,
        usedActions,
        usedMana,
        usedCertaintyDie: useCertaintyDie || undefined,
      });
      return;
    }

    const positionPReaction = (selectedAttribute === "destreza" && diretionalActionType === "destreza") ? 2 : 1;

    if (onReact && actor) {

      let rollResult: RollResult =
      {
        rawRolls:[0], 
        total: 0,
        usedMana:0, 
        CRI: 0       
      };
      
      if(selectedAttribute !== "card")
      {
        const params = {
          tokenId: actor.id,
          Q: usedActions,
          P: positionPReaction,
          A: actor.attributes[selectedAttribute!],
          PF: actor.proficiencies[selectedAttribute!]
            ? Math.ceil((actor.attributes.level - 10) / 4 + 4)
            : 0,
          O: itemCoerentAdd ? (selectedItem?.ocasionalAdd ?? 0) : 0,
          N: usedMana > 0 ? 1 : 0,
          L: actor.attributes.level,
          M: usedMana,
        };

        rollResult = calculateActionRoll(params);
      }

      onReact(
        actor.id,
        selectedAttribute,
        usedMana,
        usedActions,
        useCertaintyDie || undefined,
        rollResult,
        selectedItem,
      );
    }
  }

  const resultColor =
    resultType === "fail"
      ? "text-red-600"
      : resultType === "normal"
      ? "text-yellow-500"
      : resultType === "success"
      ? "text-green-600"
      : resultType === "critical"
      ? "text-blue-600"
      : "text-purple-600";

  return (
    <div>
      {displayForm && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop para cobrir sidebar e conteúdo */}
        <div className="absolute inset-0 backdrop-blur-md" />
        {/* Painel */}
            <img
              src={PANNEL2}
              alt=""
              className="
                absolute
                inset-0
                w-[470px]
                left-1/2 -translate-x-1/2
                top-1/2 -translate-y-1/2
                object-fill
                pointer-events-none
                z-0
              "
            />
        {/* Card centralizado */}
        <div className="relative z-10 w-full max-w-md rounded-lg p-4 text-gray-100 shadow-2xl">
          
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-18 flex items-center justify-between w-full">
            <div className="flex items-center justify-center gap-2 w-full">
              <h3 className="text-sm font-bold  uppercase">
                Reação de {resolvedName}
              </h3>
            </div>
          </div>

          {/* Result Preview */}
          <div
            className={`mb-4 grid grid-cols-2 gap-2 rounded border p-2 text-center border-2 border-blue-700 bg-blue-900/70`}
          >
            <div>
              <p className="text-[11px] uppercase opacity-80 font-semibold">Teste</p>
              <p className="text-lg font-bold">{diretionalActionValue}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase opacity-80 font-semibold">Previsão</p>
              <p className={`text-lg font-bold ${resultColor}`}>{previewDefenseRoll}</p>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-xm font-semibold text-blue-500 ">Atributo de reação</span>
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
                  ${filteredOptions[currentIndex].color}
                `}
              >
                {filteredOptions[currentIndex].icon}
                {filteredOptions[currentIndex].label}
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
          </div>

          {/* Item */}


          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel}>Ações usadas</label>
              <input
                type="number"
                min={1}
                max={maxAvailableActions}
                value={usedActions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = Number(e.target.value);
                  setUsedActions(
                    Math.max(
                      1,
                      Math.min(
                        maxAvailableActions,
                        Number.isNaN(v) ? 1 : Math.trunc(v)
                      )
                    )
                  );
                }}
                disabled={isLoading}
                className={[inputBase, hasEnoughActions ? inputOk : inputError].join(
                  " "
                )}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {!hasEnoughActions && (
                <p className={warn}>Número de ações inválido.</p>
              )}
              <p className={hint}>Disponíveis: {maxAvailableActions}</p>
            </div>

            <div>
              <label className={fieldLabel}>Mana usada</label>
              <input
                type="number"
                min={0}
                max={Math.max(0, resolvedAvailableMana)}
                value={usedMana}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = Number(e.target.value);
                  setUsedMana(
                    Math.max(
                      0,
                      Math.min(
                        Math.max(0, resolvedAvailableMana),
                        Number.isNaN(v) ? 0 : Math.trunc(v)
                      )
                    )
                  );
                }}
                disabled={isLoading}
                className={[inputBase, hasEnoughMana ? inputOk : inputError].join(
                  " "
                )}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {!hasEnoughMana && <p className={warn}>Mana insuficiente.</p>}
              <p className={hint}>Disponível: {Math.max(0, resolvedAvailableMana)}</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Item
              </label>

              <select
                value={selectedItem?.id ?? ""}
                onChange={(e) => {
                  const item =
                    availableItems.find(i => i.id === e.target.value) ?? null;

                  setSelectedItem(item);
                }}

                className={`w-full p-2 rounded bg-black/70 text-white border border-black text-sm`}
              >
                <option value="">Nenhum item</option>

                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>                
            
            <div>
              <label className={fieldLabel}>Dado Certo</label>

              <label
                className={[
                  inputBase,
                  "flex items-center gap-3 cursor-pointer",
                  canUseCertaintyDie ? inputOk : inputError,
                  (!canUseCertaintyDie || isLoading) ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={useCertaintyDie && canUseCertaintyDie}
                  onChange={(e) =>
                    setUseCertaintyDie(e.target.checked && canUseCertaintyDie)
                  }
                  disabled={!canUseCertaintyDie || isLoading}
                  className="h-4 w-4 accent-emerald-500"
                />

                <span className="text-sm text-white">
                  Usar Dado Certo
                </span>
              </label>

              {!canUseCertaintyDie && (
                <p className={warn}>Sem cargas de Dado Certo restantes.</p>
              )}

              <p className={hint}>
                Cargas: {resolvedCertainty}
              </p>
            </div>

          </div>

          <div className="absolute left-1/2 -translate-x-1/2 w-full mt-5 flex items-center justify-center gap-2">
            <Button
              onClick={handleConfirm}
              disabled={
                isLoading ||
                !selectedAttribute ||
                !hasEnoughActions ||
                !hasEnoughMana ||
                (useCertaintyDie && !canUseCertaintyDie)
              }
              className="gap-2"
            >
              Confirmar reação
            </Button>            
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Pular
            </Button>
            {
              prevActions > 0 &&
              (
                <Button
                  onClick={onPrev}
                  className="bg-pink-500 hover:bg-pink-300 text-white gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Prever
                </Button>
              )
            }

          </div>
        </div>
      </div>)}

      <button
        onClick={() => setDisplayForm(!displayForm)}
        className={`
          fixed bottom-4 left-4 z-90
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

function RadioCard(props: {
  value: ReactionAttr;
  title: string;
  description: string;
  icon?: React.ReactNode;
  selected?: boolean;
}) {
  const { value, title, description, icon, selected } = props;

  return (
    <RadioGroup.Item
      value={value}
      className={[
        "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
        selected
          ? "border-purple-500 bg-purple-500/10"
          : "border-gray-700 bg-gray-900/40 hover:bg-gray-900/60",
      ].join(" ")}
    >
      {/* Círculo do radio */}
      <div className="relative mt-1 h-4 w-4">
        {/* Círculo externo */}
        <div className="absolute inset-0 rounded-full border-2 border-gray-400" />

        {/* Bolinha interna (Indicator do Radix) */}
        <RadioGroup.Indicator className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </RadioGroup.Indicator>
      </div>

      {/* Conteúdo textual e ícone */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-100">{title}</span>
        </div>
        <span className="text-xs text-gray-400">{description}</span>
      </div>
    </RadioGroup.Item>
  );
}


export default ReactionPrompt;
