
import type { Position } from "../types/card";
import type { PivotCandidate } from "../types/pivot";
import type { Token } from "../types/token";
import type { EngineContext } from "../types/BoardEngineContext";
import type { CardEntityInstance } from "../types/card";
import { getTokensInCardEntityRadius } from "./cardEntities";
import { applyCardEntityEffectToToken } from "./cardEffects";

export function resolveTriggerFixPivot(
    context: EngineContext,
    triggerToken: Token
) {
    const { armedCard } = context;

    if (!armedCard || !triggerToken) return;

    const instance: CardEntityInstance = {
        id: crypto.randomUUID(),
        pivotSettings: armedCard.target?.pivotSettings!,
        effectToApply: armedCard.effectToApply,
        triggerId: triggerToken.id,
        duration: armedCard.duration ?? Infinity,
        position: { ...triggerToken.position },
        friendlyTeam: triggerToken.team,
    };

    const affectedTokens =
        getTokensInCardEntityRadius(
            context.boardTokens,
            instance.position,
            instance.pivotSettings.range,
            instance.triggerId
        );

    affectedTokens.forEach(token => {
        applyCardEntityEffectToToken(
            context,
            instance,
            token
        );
    });

    context.setCardEntities(prev => [
        ...prev,
        instance
    ]);
}

export function addPivot(
    context: EngineContext,
    pivot: PivotCandidate
) {
    context.setSelectedPivots(prev => [
        ...prev,
        pivot
    ]);
}
export function resolvePivotPosition(
    context: EngineContext,
    pivot: PivotCandidate
): Position {
    if (pivot.type === "cell") {
        return pivot.position;
    }

    if (pivot.type === "token") {
        const token =
            context.boardTokens.find(
                t => t.id === pivot.tokenId
            );

        if (!token) {
            throw new Error(
                "Token pivot não encontrado"
            );
        }

        return token.position;
    }

    if (pivot.type === "trigger") {
        if (!context.pendingCardResolution) {
            throw new Error(
                "Trigger-Fix sem token disparador"
            );
        }

        return context.pendingCardResolution.position;
    }

    throw new Error("Pivot inválido");
}