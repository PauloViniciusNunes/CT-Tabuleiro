import type { Card } from "./card";
import type { TokenAttributes } from "./token"


export type ItemSlot   = "primary-hand" | "off-hand" | "neck" | "ring" | "armor" | "inventory-only";
export type ItemRarity = "common" | "uncommon" | "rare" | "very-rare" | "epic" | "mitic" | "legendary" | "supreme" | "absolute";

export type Item = 
{
    name:string;
    imgUrl: string;
    desc:   string;

    id: string;                    // Seu id único.
    slot:         ItemSlot;        // Qual slot ocupa.
    ocasionalAdd: number;          // Valor bruto da adição ocasional.

    atributeToOcasionalAdd: keyof Omit<TokenAttributes, "level" | "xp">;    // Qual atributo que receberá a adição ocasional.

    habilityCards: Card[] | null;        // Habilidades que são concedidas a quem possui.
    rarity:        ItemRarity;          // Raridade.
    value:         number;              // Valor pelo qual pode ser vendido.

    craftable: boolean;                  // Pode ser usado como craft?
    craftableWith: string[] | undefined; // Armazena IDs de outros items.
}