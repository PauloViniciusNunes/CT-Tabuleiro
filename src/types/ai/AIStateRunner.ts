import { AICombatPhase } from "./AICombatPhase";

export function runAIPhase(
    phase: AICombatPhase,
    callbacks: {
        turn: () => void | (() => void);
        reaction: () => void | (() => void);
        response: () => void | (() => void);
        defense: () => void | (() => void);
    }
) {
    console.error(`[RUN AI PHASE] Fase chamada será: ${phase}`);
    switch (phase) {
        case AICombatPhase.TURN:
            return callbacks.turn();

        case AICombatPhase.REACTION:
            return callbacks.reaction();

        case AICombatPhase.RESPONSE:
            return callbacks.response();

        case AICombatPhase.DEFENSE:
            return callbacks.defense();
    }
}