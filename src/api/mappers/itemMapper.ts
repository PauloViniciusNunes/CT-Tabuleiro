import type { Card } from "../../types/card";
import type { Item, ItemSlot, ItemRarity } from "../../types/item";
import type { PassiveMechanic } from "../../types/item";

function findCardById(id: string, cards: Card[]): Card | null {
  return cards.find(card => card.id === id) ?? null;
}

export function ItemMapper(json: any, cards: Card[]): Item {
  return {
    id: json.id,

    name: json.name,
    imgUrl: json.imgUrl,
    desc: json.desc,

    slot: json.slot as ItemSlot,
    ocasionalAdd: json.ocasionalAdd,
    atributeToOcasionalAdd: json.atributeToOcasionalAdd,

    rarity: json.rarity as ItemRarity,
    value: json.value,

    craftable: json.craftable,
    craftableWith: Array.isArray(json.craftableWith)
      ? json.craftableWith
      : undefined,

    isArtifice: json.isArtifice,
    passiveMechanics: Array.isArray(json.passiveMechanics)
      ? json.passiveMechanics.filter(
          (mechanic: unknown): mechanic is PassiveMechanic => typeof mechanic === "string",
        )
      : [],

    artficeSettings: {
      lifeAdd: json.artficeSettings?.lifeAdd ?? 0,
      manaAdd: json.artficeSettings?.manaAdd ?? 0,
      mechanicToApply: (json.artficeSettings?.mechanicToApply ??
        (json.artficeSettings?.effectToApply === "queimando" ? "fogo" : null)) as PassiveMechanic | null,
      cardDispach: json.artficeSettings?.cardDispachId
        ? findCardById(json.artficeSettings.cardDispachId, cards)
        : null,
    },

    habilityCards: Array.isArray(json.cardsIds)
      ? json.cardsIds
          .map((id: string) => findCardById(id, cards))
          .filter((card: Card): card is Card => card !== null)
      : null,

    vfxUrl: Array.isArray(json.vfxUrl)
      ? json.vfxUrl
      : undefined,

    sfxUrl: json.sfxUrl ?? undefined,
  };
}

export function JsonItemMapper(item: Item): any {
  return {
    id: item.id,

    name: item.name,
    imgUrl: item.imgUrl,
    desc: item.desc,

    slot: item.slot,
    ocasionalAdd: item.ocasionalAdd,
    atributeToOcasionalAdd: item.atributeToOcasionalAdd,

    rarity: item.rarity,
    value: item.value,

    craftable: item.craftable,
    craftableWith: item.craftableWith ?? [],

    isArtifice: item.isArtifice,
    passiveMechanics: item.passiveMechanics,

    artficeSettings: {
      lifeAdd: item.artficeSettings.lifeAdd,
      manaAdd: item.artficeSettings.manaAdd,
      mechanicToApply: item.artficeSettings.mechanicToApply,
      cardDispachId: item.artficeSettings.cardDispach?.id ?? null,
    },

    cardsIds: item.habilityCards?.map(card => card.id) ?? [],

    vfxUrl: item.vfxUrl ?? [],
    // `sfxUrl` is optional in the API contract. Keeping it undefined makes
    // JSON omit the property instead of serializing an invalid `null` value.
    sfxUrl: item.sfxUrl ?? undefined,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
