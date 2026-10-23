import type { Card, TokenInstance } from "@prisma/client";

import { EngineCardValidator } from "../../validators/EngineCardValidator";
import type { AiCardDecision } from "../types/AiDecision";
import { randomChoice, type RandomSource } from "../utils/random";

interface AiCardDecisionInput {
    readonly token: TokenInstance;
    readonly boardTokens: readonly TokenInstance[];
    readonly cards: readonly Card[];
    readonly availableActions: number;
    readonly cardsOnRecharge: readonly string[];
}

function targetsForCard(
    token: TokenInstance,
    boardTokens: readonly TokenInstance[],
    causalityType: string,
): TokenInstance[] {
    if (causalityType === "Cure") {
        return boardTokens
            .filter((candidate) =>
                candidate.team === token.team &&
                candidate.id !== token.id &&
                candidate.currentLife > 0 &&
                candidate.currentLife < candidate.maxLife,
            )
            .sort((left, right) =>
                left.currentLife / Math.max(1, left.maxLife) -
                right.currentLife / Math.max(1, right.maxLife),
            );
    }
    return boardTokens.filter((candidate) =>
        candidate.team !== token.team && candidate.currentLife > 0,
    );
}

/** Returns every usable non-defensive card with a valid target payload. */
export function listAiCardDecisions(
    input: AiCardDecisionInput,
    random: RandomSource = Math.random,
): AiCardDecision[] {
    const proficiency = Math.ceil((input.token.level - 10) / 4 + 4);

    return input.cards.flatMap((rawCard) => {
        const parsed = EngineCardValidator.safeParse(rawCard);
        if (!parsed.success) return [];
        const card = parsed.data;
        if (
            card.causalityType === "Defensive" ||
            input.cardsOnRecharge.includes(card.id) ||
            card.actionsRequired > input.availableActions ||
            card.manaRequired * proficiency > input.token.currentMana
        ) return [];

        const candidates = targetsForCard(
            input.token,
            input.boardTokens,
            card.causalityType,
        );
        if (card.target.type === "Target" && candidates.length === 0) return [];
        if (card.target.type === "Multi-Target" && candidates.length === 0) return [];

        const target = card.target.type === "Self"
            ? {
                type: "Self" as const,
                tokenTarget: null,
                numbersTarget: 1,
                pivot: null,
            }
            : card.target.type === "Ambient"
                ? {
                    type: "Ambient" as const,
                    tokenTarget: null,
                    numbersTarget: 0,
                    pivot: null,
                    pivotSettings: card.target.pivotSettings,
                }
                : card.target.type === "Target"
                    ? {
                        type: "Target" as const,
                        tokenTarget: [randomChoice(candidates, random) ?? candidates[0]],
                        numbersTarget: 1,
                        pivot: null,
                    }
                    : {
                        type: "Multi-Target" as const,
                        tokenTarget: [...candidates]
                            .sort(() => random() - 0.5)
                            .slice(0, Math.max(1, card.target.numbersTarget ?? 1)),
                        numbersTarget: Math.max(1, card.target.numbersTarget ?? 1),
                        pivot: null,
                    };

        return [{ card: rawCard, target }];
    });
}

export function decideAiCard(
    input: AiCardDecisionInput,
    random: RandomSource = Math.random,
): AiCardDecision | null {
    return randomChoice(listAiCardDecisions(input, random), random);
}
