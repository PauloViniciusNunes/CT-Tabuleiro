import type { Card, CardCausality, NonDefensiveCardCausality, SpellCircle, SpellType  } from "../../types/card";
import type { EffectType } from "../../types/effects";

export function CardMapper(json: any): Card {
  return {
    id: json.id,

    name: json.name,
    desc: json.desc,
    img: json.img,

    spellType: (json.spellType ?? null) as SpellType,
    spellCircle: (json.spellCircle ?? null) as SpellCircle,

    baseDice: json.baseDice ?? null,
    manaRequired: json.manaRequired ?? null,
    actionsRequired: json.actionsRequired ?? null,
    duration: json.duration ?? 0,

    recharge: json.recharge,
    remainingDuration: json.remainingDuration,
    itsLoaded: json.itsLoaded,

    causality: json.causality,
    causalityType: json.causalityType as CardCausality,
    defenseReplicate: json.defenseReplicate as NonDefensiveCardCausality,
    partialOffensive: json.partialOffensive ?? undefined,
    entityQuantity: json.entityQuantity,

    effectToApply: Array.isArray(json.effectToApply)
      ? (json.effectToApply as EffectType[])
      : [],

    target: json.target,
  };
}

export function JsonCardMapper(card: Card): any {
  return {
    id: card.id,

    name: card.name,
    desc: card.desc,
    img: card.img,

    spellType: card.spellType ?? "None",
    spellCircle: card.spellCircle ?? 0,

    baseDice: card.baseDice ?? null,
    manaRequired: card.manaRequired ?? 0,
    actionsRequired: card.actionsRequired ?? 0,
    duration: card.duration ?? 1,

    recharge: Number(card.recharge),
    remainingDuration: card.remainingDuration,
    itsLoaded: card.itsLoaded,

    causality: card.causality,
    causalityType: card.causalityType,
    defenseReplicate: card.defenseReplicate ?? "None",
    partialOffensive: card.partialOffensive ?? false,
    entityQuantity: card.entityQuantity,

    effectToApply: card.effectToApply ?? [],
    target: card.target,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}