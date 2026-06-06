import type { Token } from "../types/token";
import type { CardEntityInstance, Position } from "../types/card";
import type { EngineContext } from "../types/BoardEngineContext";

import { isTokenInCardInstanceRange } from "./cardQueries";
import {
    tokenHasCardEffect,
    applyCardEffectToToken,
    removeCardEffectsFromToken
} from "./cardEffects";

export function resolveCardEntityPosition(
    card: CardEntityInstance,
    tokens: Token[]
): Position | null {
    if (card.pivotSettings.pivotType === "Cell-Fix") {
        return card.position;
    }

    if (card.pivotSettings.pivotType === "Trigger-Fix") {
        const trigger = tokens.find(t => t.id === card.triggerId);
        return trigger?.position ?? null;
    }

    if (card.pivotSettings.pivotType === "Token-Fix") {
        const anchor = tokens.find(t => t.id === card.anchorTokenId);
        return anchor?.position ?? null;
    }

    return null;
}

export function reconcileCardEntityEffects(
    tokens: Token[],
    cards: CardEntityInstance[]
): Token[] {
    return tokens.map(token => {
        let updatedToken = { ...token };

        for (const card of cards) {
            // aliados ignoram completamente
            if (updatedToken.team === card.friendlyTeam) continue;

            const pivotPosition = resolveCardEntityPosition(card, tokens);
            if (!pivotPosition) continue;

            const virtualCard = {
                ...card,
                position: pivotPosition
            };

            const isInside = isTokenInCardInstanceRange(
                updatedToken,
                virtualCard
            );

            const hasEffect = tokenHasCardEffect(
                updatedToken,
                card.id
            );

            if (isInside && !hasEffect) {
                updatedToken = applyCardEffectToToken(
                    updatedToken,
                    card
                );
            }

            if (!isInside && hasEffect) {
                updatedToken = removeCardEffectsFromToken(
                    updatedToken,
                    card.id
                );
            }
        }

        return updatedToken;
    });
}

export function registerCardEntities(
    context: EngineContext,
    instances: CardEntityInstance[]
) {
    context.setCardEntities(prev => [
        ...prev,
        ...instances
    ]);
}

export function getTokensInCardEntityRadius(
    tokens: Token[],
    position: Position,
    range: number,
    triggerId: string
): Token[] {
    return tokens.filter(t => {
        const dx = Math.abs(
            t.position.col - position.col
        );

        const dy = Math.abs(
            t.position.row - position.row
        );

        return (
            dx <= range &&
            dy <= range &&
            t.id !== triggerId
        );
    });
}