import type { Pivot, Target } from "./target"
import type { EffectType } from "./effects";
import type { TokenTeam } from "./token";


export type CardCausality = "Direct-Damage" | "Only-Effect-Application" | "Offensive" | "Defensive" | "Cure";
export type CardDuration  = number;

export type Position = {
    row: number,
    col: number,
}

export type SpellType     = "Abjuração" | "Encantamento" | "Conjuração" | "Ilusão" | "Transmutação" | "Advinhação" | "Necromancia" | "Evocação"|null;
export type SpellCircle   = 1|2|3|4|5|6|7|8|9|null;
export type BaseDice =
{
    quantity: number,
    type: string
}

export type Card = 
{
    id: string,
    img: string,
    desc: string,
    name: string,
    spellType?: SpellType,
    spellCircle?: SpellCircle,
    baseDice?: BaseDice | null,
    manaRequired?: number | null,
    actionsRequired?: number | null,
    duration?: CardDuration,
    recharge: Number,
    remainingDuration: number, // = duration, por padrão
    itsLoaded: boolean,        
    causality: string,
    causalityType: CardCausality,
    partialOffensive: boolean | undefined,
    entityQuantity: number,
    effectToApply: EffectType[],
    target: Target,
}

export type CardEntityInstance =
{
    id: string; // Adicionado.
    triggerId: string;
    anchorTokenId?: string;
    effectToApply: EffectType[];
    pivotSettings: Pivot;
    duration: number;
    position: Position;
    friendlyTeam?: TokenTeam;
}