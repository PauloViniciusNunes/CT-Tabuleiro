import { AICombatPhase } from "./AICombatPhase";

export function runAIPhase(
    phase: AICombatPhase,
    callbacks: {
        turn: () => void;
        reaction: () => void;
        response: () => void;
        defense: () => void;
    }
) {
    switch (phase) {
        case AICombatPhase.TURN:
            callbacks.turn();
            break;

        case AICombatPhase.REACTION:
            callbacks.reaction();
            break;

        case AICombatPhase.RESPONSE:
            callbacks.response();
            break;

        case AICombatPhase.DEFENSE:
            callbacks.defense();
            break;
    }
}