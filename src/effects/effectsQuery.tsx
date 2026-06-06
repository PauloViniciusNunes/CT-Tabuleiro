import type { Token } from "../types/token";
import type { EffectType } from "../types/effects";

export function tokenHasEffects(token: Token, effects: EffectType[]): boolean {
    const list = token.tokenEffects ?? [];
    return effects.every(effect =>
        list.some(e => e.effectType === effect)
    );
}

export function getTokensInRadius(tokens: Token[], center: Token, radius: number) {
    return tokens.filter(t => {
        const dx = Math.abs(t.position.col - center.position.col);
        const dy = Math.abs(t.position.row - center.position.row);
        return dx <= radius && dy <= radius;
    });
}   