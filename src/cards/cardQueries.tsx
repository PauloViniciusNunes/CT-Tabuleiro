import type { Card } from "../types/card";

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
