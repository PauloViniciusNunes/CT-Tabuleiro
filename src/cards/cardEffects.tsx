import type { Token } from "../types/token";
import type { TokenEffect } from "../types/effects";
import type { CardEntityInstance } from "../types/card";
import { getTokensInCardEntityRadius } from "./cardEntities";
import { applyTokenEffect } from "../effects/effectsApplication";
import type { EngineContext } from "../types/BoardEngineContext";

export function decreaseCardEntityDuration(
    context: EngineContext,
    triggerId: string
) {
    context.setCardEntities(prev => {
        const updated = prev.map(c =>
            c.triggerId === triggerId
                ? { ...c, duration: c.duration - 1 }
                : c
        );

        const expired = updated.filter(c => c.duration <= 0);

        if (expired.length > 0) {
            const expiredIds = expired.map(c => c.id);

            context.setBoardTokens(tokens =>
                tokens.map(t => ({
                    ...t,
                    tokenEffects: t.tokenEffects?.filter(
                        e => !expiredIds.includes(
                            e.cardResultantId ?? ""
                        )
                    )
                }))
            );
        }

        return updated.filter(c => c.duration > 0);
    });
}

export function tokenHasCardEffect(
    token: Token,
    cardId: string
): boolean | undefined {
    return token.tokenEffects?.some(
        eff =>
            eff.isCardResultant === true &&
            eff.cardResultantId === cardId
    );
}

export function applyCardEffectToToken(
    token: Token,
    card: CardEntityInstance
): Token {
    if (token.team === card.friendlyTeam) {
        return token;
    }

    const currentEffects = token.tokenEffects ?? [];

    const newEffects: TokenEffect[] =
        card.effectToApply
            .filter(effect =>
                !currentEffects.some(e =>
                    e.cardResultantId === card.id &&
                    e.effectType === effect
                )
            )
            .map(effect => ({
                duration: undefined,
                intensity: 1,
                effectType: effect,
                elementResultant: "neutro",
                effectMoment: "AllTurn",
                isCardResultant: true,
                cardResultantId: card.id
            }));

    if (newEffects.length === 0) {
        return token;
    }

    return {
        ...token,
        tokenEffects: [
            ...currentEffects,
            ...newEffects
        ]
    };
}

export function removeCardEffectsFromToken(
    token: Token,
    cardId: string
): Token {
    return {
        ...token,
        tokenEffects: token.tokenEffects?.filter(
            eff =>
                !eff.isCardResultant ||
                eff.cardResultantId !== cardId
        )
    };
}

export function applyCardEntityEffect(
    context: EngineContext
) {
    context.cardEntities.forEach(cardEntity => {
        const affectedTokens =
            getTokensInCardEntityRadius(
                context.boardTokens,
                cardEntity.position,
                cardEntity.pivotSettings.range,
                cardEntity.triggerId
            );

        const triggerToken =
            context.boardTokens.find(
                t => t.id === cardEntity.triggerId
            );

        const tokenProficiency = Math.ceil(
            (((triggerToken?.attributes.level ?? 1) - 10) / 4) + 4
        );

        affectedTokens
            .filter(
                token => token.team !== cardEntity.friendlyTeam
            )
            .forEach(token => {
                cardEntity.effectToApply.forEach(effect => {
                    applyTokenEffect(
                        context,
                        token,
                        "neutro",
                        effect,
                        undefined,
                        tokenProficiency,
                        "AllTurn",
                        true,
                        cardEntity.id
                    );
                });
            });
    });
}

export function applyCardEntityEffectToToken(
    context: EngineContext,
    cardEntity: CardEntityInstance,
    targetToken: Token
) {
    if (
        targetToken.team ===
        cardEntity.friendlyTeam
    ) {
        return;
    }

    const triggerToken =
        context.boardTokens.find(
            t => t.id === cardEntity.triggerId
        );

    const tokenProficiency = Math.ceil(
        (((triggerToken?.attributes.level ?? 1) - 10) / 4) + 4
    );

    cardEntity.effectToApply.forEach(effect => {
        applyTokenEffect(
            context,
            targetToken,
            "neutro",
            effect,
            undefined,
            tokenProficiency,
            "AllTurn",
            true,
            cardEntity.id
        );
    });
}