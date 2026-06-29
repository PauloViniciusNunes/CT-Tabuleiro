import type { AICombatPhase } from "../../types/ai/AICombatPhase";

export const AITransitions: Record<
    AICombatPhase,
    AICombatPhase[]
> = {
    IDLE: [
        "TURN",
        "RESPONSE"
    ],

    TURN: [
        "REACTION",
        "RESPONSE",
        "IDLE"
    ],

    REACTION: [
        "REACTION",
        "RESPONSE",
        "IDLE",
        "TURN"
    ],

    RESPONSE: [
        "RESPONSE",
        "DEFENSE",
        "REACTION",
        "IDLE",
        "TURN"
    ],

    DEFENSE: [
        "TURN",
        "RESPONSE",
        "IDLE"
    ]
};