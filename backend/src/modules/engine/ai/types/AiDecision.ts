import type { Card, TokenInstance } from "@prisma/client";

export type AiStance = "fight" | "flight";

export interface AiMovementDecision {
    readonly stance: AiStance;
    readonly to: {
        readonly col: number;
        readonly row: number;
    };
}

export interface AiCardDecision {
    readonly card: Card;
    readonly target: {
        readonly type: "Self" | "Target" | "Multi-Target" | "Ambient";
        readonly tokenTarget: readonly TokenInstance[] | null;
        readonly numbersTarget: number;
        readonly pivot: null;
        readonly pivotSettings?: unknown;
    };
}

export type AiTurnDecision =
    | { readonly kind: "pass" }
    | {
        readonly kind: "execute";
        readonly choice: Readonly<Record<string, unknown>>;
    };
