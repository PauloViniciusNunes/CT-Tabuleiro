import type {
  Card,
  CardCausality,
  CardDuration,
  NonDefensiveCardCausality,
  SpellCircle,
  SpellType,
} from "../../types/card";
import type { EffectType } from "../../types/effects";
import type { PivotType, TargetType } from "../../types/target";
import { generateUUID } from "../../utils/generateUUID";

export interface CardFormModel {
  existing?: Card;
  name: string;
  imageUrl: string;
  description: string;
  causality: string;
  causalityType: CardCausality;
  defenseReplicate: NonDefensiveCardCausality;
  spellType: SpellType;
  spellCircle: SpellCircle;
  entityQuantity: number;
  partialOffensive?: boolean;
  actionsRequired: number;
  targetType: TargetType;
  targetQuantity: number;
  pivotImageUrl: string;
  pivotType: PivotType;
  pivotRange: number;
  duration: CardDuration;
  recharge: number;
  effects: EffectType[];
  baseDice?: { quantity: number; type: string };
  manaRequired?: number;
}

/** Single domain model used by both Card Create and Card Edit forms. */
export function cardFromForm(model: CardFormModel): Card {
  // Proteção adicional para dados de formulário antigos: um select visualmente
  // em "Self" não pode gerar um target.type vazio no banco.
  const targetType: TargetType = model.targetType || "Self";

  return {
    ...model.existing,
    id: model.existing?.id ?? generateUUID(),
    name: model.name.trim(),
    img: model.imageUrl.trim(),
    desc: model.description.trim(),
    causality: model.causality.trim(),
    causalityType: model.causalityType,
    defenseReplicate: model.defenseReplicate,
    spellCircle: model.spellCircle,
    spellType: model.spellType,
    entityQuantity: Math.max(0, Math.trunc(model.entityQuantity)),
    partialOffensive: model.partialOffensive,
    // O custo de ação é independente da rolagem do card. Um card pode ser
    // gratuito, mas nunca pode persistir um custo negativo.
    actionsRequired: Math.max(0, Math.trunc(model.actionsRequired)),
    target: {
      type: targetType,
      pivot: targetType === "Ambient" ? [1, 1] : null,
      pivotSettings: targetType === "Ambient"
        ? {
          areaImgUrl: model.pivotImageUrl,
          pivotType: model.pivotType,
          range: Math.max(0, Math.trunc(model.pivotRange)),
        }
        : undefined,
      numbersTarget: Math.max(1, Math.trunc(model.targetQuantity)),
      tokenTarget: null,
    },
    duration: Math.max(0, Math.trunc(model.duration)),
    recharge: Math.max(0, Math.trunc(model.recharge)),
    remainingDuration: Math.max(0, Math.trunc(model.duration)),
    itsLoaded: model.existing?.itsLoaded ?? true,
    effectToApply: [...model.effects],
    baseDice: model.baseDice
      ? { quantity: Math.max(1, Math.trunc(model.baseDice.quantity)), type: model.baseDice.type }
      : null,
    manaRequired: model.manaRequired ?? null,
  };
}
