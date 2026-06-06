import type { AICombatPhase } from "../../types/ai/AICombatPhase";

export const AITransitions: Record<
    AICombatPhase,
    AICombatPhase[]
> = {
    IDLE: [
        "TURN"
    ],

    TURN: [
        "REACTION",
        "IDLE"
    ],

    REACTION: [
        "RESPONSE",
        "IDLE"
    ],

    RESPONSE: [
        "DEFENSE",
        "IDLE"
    ],

    DEFENSE: [
        "TURN",
        "IDLE"
    ]
};