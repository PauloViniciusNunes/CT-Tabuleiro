import type { Card } from "../../types/card";
import type { Item, ItemRarity, ItemSlot, PassiveMechanic } from "../../types/item";
import type { TokenAttributes } from "../../types/token";
import { generateUUID } from "../../utils/generateUUID";

export interface ItemFormModel {
  existing?: Item;
  name: string;
  imageUrl: string;
  description: string;
  slot: ItemSlot;
  occasionalAdd: number;
  occasionalAttribute: keyof Omit<TokenAttributes, "level" | "xp">;
  cards: Card[];
  rarity: ItemRarity;
  value: number;
  craftable: boolean;
  isArtifice: boolean;
  passiveMechanics: PassiveMechanic[];
  artificeLifeAdd: number;
  artificeManaAdd: number;
  artificeMechanic: PassiveMechanic | null;
  artificeCard: Card | null;
  vfxUrl: string[];
  sfxUrl?: string;
}

/** Single domain model used by both Item Create and Item Edit forms. */
export function itemFromForm(model: ItemFormModel): Item {
  return {
    ...model.existing,
    id: model.existing?.id ?? generateUUID(),
    name: model.name.trim(),
    imgUrl: model.imageUrl.trim(),
    desc: model.description.trim(),
    slot: model.isArtifice ? "inventory-only" : model.slot,
    ocasionalAdd: Math.trunc(model.occasionalAdd),
    atributeToOcasionalAdd: model.occasionalAttribute,
    habilityCards: model.cards.length > 0 ? [...model.cards] : null,
    rarity: model.rarity,
    value: Math.max(0, Math.trunc(model.value)),
    craftable: model.craftable,
    craftableWith: model.existing?.craftableWith,
    isArtifice: model.isArtifice,
    passiveMechanics: [...model.passiveMechanics],
    artficeSettings: {
      lifeAdd: Math.trunc(model.artificeLifeAdd),
      manaAdd: Math.trunc(model.artificeManaAdd),
      mechanicToApply: model.artificeMechanic,
      cardDispach: model.artificeCard,
    },
    vfxUrl: [...model.vfxUrl],
    sfxUrl: model.sfxUrl || undefined,
  };
}
