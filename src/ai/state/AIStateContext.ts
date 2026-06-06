import type { AICombatPhase } from "../../types/ai/AICombatPhase";

export interface AIStateContext {
    currentPhase: AICombatPhase;

    currentTokenId?: string;

    currentTargetId?: string;

    currentActionId?: string;
}