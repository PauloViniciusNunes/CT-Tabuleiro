// /src/components/ui/ReactionPrompt.tsx
import React, { useEffect, useMemo, useState } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Switch from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { Shield, Swords, Zap, XCircle, CheckCircle2, Brain, Book} from "lucide-react";
import { GiDiceTwentyFacesTwenty} from "react-icons/gi";
import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";
import {
  calculateDistance,
  isInAttackRange,
  calculateActionRoll,
} from "../../utils/battleCalculations";

type ReactionAttr = "destreza" | "consistencia" | "inteligencia" | "sabedoria";

type ActorLike = Token & { reactionType: ReactionAttr };

interface RadioCardProps {
  value: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
}

export interface ReactionPromptProps {
  // Forma nova (normalizada)
  defenderName?: string;
  diretionalActionType?: string;
  availableActions: number;
  availableMana?: number;
  certaintyDieCharges?: number;
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
          "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-400 focus:ring-offset-gray-900",
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
  destreza: ["destreza"],
  forca: ["destreza", "consistencia"],
  inteligencia: ["inteligencia"],
  sabedoria: ["sabedoria"],
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
  "mb-1 block text-xs font-medium uppercase tracking-wide text-gray-300";
const inputBase =
  "w-full rounded border p-2 text-sm focus:outline-none focus:ring-1 transition-colors";
const inputOk = "bg-gray-700 border-gray-600 text-white focus:ring-purple-400";
const inputError = "bg-red-900 border-red-600 text-red-100 focus:ring-red-400";
const hint = "mt-1 text-[11px] leading-snug text-gray-400";
const warn = "mt-1 text-[11px] leading-snug text-amber-300";

const ReactionPrompt: React.FC<ReactionPromptProps> = (props) => {
  const {
    // normalizado ou legado
    defenderName,
    diretionalActionType,
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
  useEffect(() => {
    if (!isReactionAllowed && onSkip) onSkip();
  }, [isReactionAllowed, onSkip]);

  // Deriva dados quando vier "actor"
  const resolvedName = actor?.name ?? defenderName ?? "Defensor";
  const resolvedAvailableMana = actor?.currentMana ?? availableMana ?? 0;
  const resolvedCertainty =
    actor?.certaintyDiceRemaining ?? certaintyDieCharges ?? 0;

  // Estado local
  const [selectedAttribute, setSelectedAttribute] =
    useState<ReactionAttr | null>(actor?.reactionType ?? null);
  const [usedActions, setUsedActions] = useState<number>(1);
  const [usedMana, setUsedMana] = useState<number>(0);
  const [useCertaintyDie, setUseCertaintyDie] = useState<boolean>(false);
  const [currentRoll, setCurrentRoll] = useState<number | RollResult | undefined>(
    undefined
  );

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
      const params = {
        tokenId: actor.id,
        Q: usedActions,
        P: positionPReaction,
        A: actor.attributes[selectedAttribute!],
        PF: actor.proficiencies[selectedAttribute!]
          ? Math.ceil((actor.attributes.level - 10) / 4 + 4)
          : 0,
        O: 0,
        N: usedMana > 0 ? 1 : 0,
        L: actor.attributes.level,
        M: usedMana,
      };

      const rollResult = calculateActionRoll(params);

      onReact(
        actor.id,
        selectedAttribute,
        usedMana,
        usedActions,
        useCertaintyDie || undefined,
        rollResult
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop para cobrir sidebar e conteúdo */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Card centralizado */}
      <div className="relative z-10 w-full max-w-md rounded-lg border-2 border-purple-600 bg-gray-800 p-4 text-gray-100 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-bold text-purple-500">
               Reação de {resolvedName}
            </h3>
          </div>
          <span className="text-[11px] text-gray-400">
            Ações: {maxAvailableActions} • Mana: {Math.max(0, resolvedAvailableMana)}
          </span>
        </div>

        <div className="mb-4">
          <span className="text-xs text-gray-300">Atributo de reação</span>
          <RadioGroup.Root
            className="mt-2 grid grid-cols-2 gap-2"
            value={selectedAttribute ?? ""}
            onValueChange={(v: string) => setSelectedAttribute(v as ReactionAttr)}
            disabled={isLoading}
          >
            {allowedOptions.map((attr) => (
              <RadioCard
                key={attr}
                value={attr}
                title={radioOptions[attr].title}
                description={radioOptions[attr].description}
                icon={radioOptions[attr].icon}
                selected={selectedAttribute === attr}
              />
            ))}
          </RadioGroup.Root>
        
        <p className="mt-2 text-xs text-gray-400">
          {reactionTypeLabel} — {attributeDescriptions[selectedAttribute ?? ""] ?? ""}
        </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

          <div className="flex flex-col">
            <label className={fieldLabel}>Dado Certo</label>
            <div className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900/40 p-2">
              <Switch.Root
                className={[
                  "relative h-6 w-11 cursor-pointer rounded-full outline-none",
                  useCertaintyDie ? "bg-emerald-500" : "bg-gray-600",
                  !canUseCertaintyDie || isLoading ? "opacity-50" : "",
                ].join(" ")}
                checked={useCertaintyDie && canUseCertaintyDie}
                onCheckedChange={(checked: boolean) =>
                  setUseCertaintyDie(!!checked && canUseCertaintyDie)
                }
                disabled={!canUseCertaintyDie || isLoading}
                id="certainty-die"
              >
                <Switch.Thumb
                  className={[
                    "block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform",
                    useCertaintyDie && canUseCertaintyDie
                      ? "translate-x-[22px]"
                      : "translate-x-0.5",
                  ].join(" ")}
                />
              </Switch.Root>
              <div className="flex flex-col">
                <span className="text-xs text-gray-200">Usar Dado Certo</span>
                <span className="text-[11px] text-gray-400">
                  Cargas: {resolvedCertainty}
                </span>
              </div>
            </div>
            {!canUseCertaintyDie && (
              <p className={warn}>Sem cargas de Dado Certo restantes.</p>
            )}
            <p className={hint}>
              Ao usar, a rolagem de reação considera sucesso garantido conforme sua regra de jogo.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
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
                <Brain className="h-4 w-4"/>
                Prever
              </Button>
            )
          }
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
            <GiDiceTwentyFacesTwenty className="h-4 w-4" />
            Confirmar reação
          </Button>
        </div>
      </div>
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
