import type { EquippedSlot, Item } from "../types/item";
import type { Token } from "../types/token";
import type { Card } from "../types/card";
import { cardIds } from "../cards/cardQueries";
import { setTransformerAdd, setTransformerRemove } from "../utils/setUtils";
import { resolveCardsById } from "../cards/cardQueries";

function getEquippedItemCardSets(
    token: Token
): Card[][] {
    const slots: EquippedSlot[] =
        [
            "primaryHand",
            "offHand",
            "neck",
            "ring",
            "armor",
        ];

    return slots
        .map(
            slot =>
                token.inventory[slot]?.habilityCards
        )
        .filter(
            (cards): cards is Card[] =>
                Boolean(cards)
        );
}

export function computeTokenCardsWithSets(
    token: Token,
    removedItem?: Item,
    addedItem?: Item
  ): Card[] {
    let p =
      cardIds(
        token.tokenCards
      );

    const sources =
      getEquippedItemCardSets(token);

    // união dos items atuais
    for (const src of sources) {
      p =
        setTransformerAdd(
          p,
          cardIds(src)
        );
    }

    // adicionar novo item
    if (
      addedItem?.habilityCards
    ) {
      p =
        setTransformerAdd(
          p,
          cardIds(
            addedItem.habilityCards
          )
        );
    }

    // remover exclusivo
    if (
      removedItem?.habilityCards
    ) {
      const vi =
        [
          cardIds(
            token.tokenCards
          ),

          ...sources.map(
            cardIds
          ),

          cardIds(
            removedItem.habilityCards
          ),
        ];

      p =
        setTransformerRemove(
          p,
          cardIds(
            removedItem.habilityCards
          ),
          vi
        );
    }

    return resolveCardsById(
      p,
      [
        token.tokenCards,
        ...sources,
        addedItem?.habilityCards,
        removedItem?.habilityCards
      ]
    );
  }