import type { Token } from "../types/token";
import type { Card } from "../types/card";
import type { CardEntityInstance } from "../types/card";


export function isTokenInCardInstanceRange(token: Token, cardInstance: CardEntityInstance) {
    const dx = Math.abs(token.position.col - cardInstance.position.col);
    const dy = Math.abs(token.position.row - cardInstance.position.row);
    const output = dx <= cardInstance.pivotSettings.range && dy <= cardInstance.pivotSettings.range;
    return output;
}

export function cardIds(cards: Card[] | null | undefined): string[] {
    if (!cards) return [];
    return cards.map(c => c.id);
}

export function resolveCardsById(
    ids: string[],
    sources: (Card[] | null | undefined)[]
): Card[] {
    const map = new Map<string, Card>();

    for (const src of sources) {
        if (!src) continue;

        for (const c of src)
            map.set(c.id, c);
    }

    return ids
        .map(id => map.get(id))
        .filter(Boolean) as Card[];
}    