import type { Pivot, Target } from "./target"
import type { EffectType } from "./effects";
import type { TokenTeam } from "./token";


export type CardCausality = "Direct-Damage" | "Only-Effect-Application" | "Offensive" | "Defensive" | "Cure" | "None"; 
export type NonDefensiveCardCausality = Exclude<CardCausality, "Defensive">;
export type CardDuration  = number;
export type OffensiveCardAttribute =
    | "forca"
    | "destreza"
    | "consistencia"
    | "inteligencia"
    | "sabedoria"
    | "carisma";

export type Position = {
    row: number,
    col: number,
}

export type SpellType     = "Abjuração" | "Encantamento" | "Conjuração" | "Ilusão" | "Transmutação" | "Advinhação" | "Necromancia" | "Evocação"| "None" | null;
export type SpellCircle   = 1|2|3|4|5|6|7|8|9|0|null;
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
    spellType?: SpellType, // enum
    spellCircle?: SpellCircle,
    baseDice?: BaseDice | null,
    manaRequired?: number | null,
    actionsRequired?: number | null,
    duration?: CardDuration, // CardDuration = number
    recharge: Number,
    remainingDuration: number, // = duration, por padrão
    itsLoaded: boolean,        
    causality: string,
    causalityType: CardCausality, //enum
    defenseReplicate: NonDefensiveCardCausality,
    partialOffensive: boolean | undefined,
    entityQuantity: number,
    effectToApply: EffectType[],
    target: Target,
}

export type MechanicOverlay = {
    id: string; // Adicionado.
    triggerId: string;
    anchorTokenId?: string;
    effectToApply: EffectType[];
    pivotSettings: Pivot;
    duration: number;
    position: Position;
    friendlyTeam?: TokenTeam;
}

export type OffensiveCardResponse = {
    defenderId: string;
    attribute: OffensiveCardAttribute;
    usedMana: number;
    usedActions: number;
    usedCertainDie: boolean;
    previewAction: boolean;
};
