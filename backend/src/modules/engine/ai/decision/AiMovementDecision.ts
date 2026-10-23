import type { Map as BoardMap, TokenInstance } from "@prisma/client";

import type { AiMovementDecision, AiStance } from "../types/AiDecision";
import { chance, randomChoice, type RandomSource } from "../utils/random";

interface Position {
    readonly col: number;
    readonly row: number;
}

function distance(left: Position, right: Position): number {
    return Math.max(
        Math.abs(left.col - right.col),
        Math.abs(left.row - right.row),
    );
}

function positionKey(position: Position): string {
    return `${position.col}:${position.row}`;
}

function availableDestinations(
    token: TokenInstance,
    boardMap: BoardMap & {
        mapObjs?: readonly { col: number; row: number; type?: string }[];
    },
    boardTokens: readonly TokenInstance[],
): Position[] {
    const limit = Math.max(0, Math.floor(token.naturalMovement));
    if (limit < 1) return [];

    const blocked = new Set(
        boardTokens
            .filter((candidate) => candidate.id !== token.id)
            .map((candidate) => positionKey(candidate)),
    );
    for (const mapObject of (boardMap.mapObjs ?? []).filter(
        (object) => object.type === undefined || object.type === "wall",
    )) {
        blocked.add(positionKey(mapObject));
    }

    const destinations: Position[] = [];
    for (
        let col = Math.max(1, token.col - limit);
        col <= Math.min(boardMap.cols, token.col + limit);
        col += 1
    ) {
        for (
            let row = Math.max(1, token.row - limit);
            row <= Math.min(boardMap.rows, token.row + limit);
            row += 1
        ) {
            const candidate = { col, row };
            if (
                (col === token.col && row === token.row) ||
                blocked.has(positionKey(candidate))
            ) continue;
            destinations.push(candidate);
        }
    }
    return destinations;
}

function bestDestinations(
    stance: AiStance,
    token: TokenInstance,
    enemies: readonly TokenInstance[],
    destinations: readonly Position[],
    random: RandomSource,
): Position | null {
    if (destinations.length === 0 || enemies.length === 0) return null;

    const currentNearestDistance = Math.min(
        ...enemies.map((enemy) => distance(token, enemy)),
    );
    const selectedEnemy = randomChoice(enemies, random) ?? enemies[0];
    const score = (candidate: Position) => stance === "fight"
        ? distance(candidate, selectedEnemy)
        : Math.min(...enemies.map((enemy) => distance(candidate, enemy)));
    const scores = destinations.map(score);
    const bestScore = stance === "fight"
        ? Math.min(...scores)
        : Math.max(...scores);

    const improvesPosition = stance === "fight"
        ? bestScore < distance(token, selectedEnemy)
        : bestScore > currentNearestDistance;
    if (!improvesPosition) return null;

    return randomChoice(
        destinations.filter((candidate) => score(candidate) === bestScore),
        random,
    );
}

/** Chooses one legal natural-movement destination using a fight-or-flight policy. */
export function decideAiMovement(
    token: TokenInstance,
    enemies: readonly TokenInstance[],
    boardMap: BoardMap & {
        mapObjs?: readonly { col: number; row: number; type?: string }[];
    },
    boardTokens: readonly TokenInstance[],
    random: RandomSource = Math.random,
): AiMovementDecision | null {
    const stance: AiStance = chance(0.65, random) ? "fight" : "flight";
    const to = bestDestinations(
        stance,
        token,
        enemies,
        availableDestinations(token, boardMap, boardTokens),
        random,
    );
    return to ? { stance, to } : null;
}
