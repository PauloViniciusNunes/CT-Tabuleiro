import { AITransitions } from "./AIStateTransition";
import type { AICombatPhase } from "../../types/ai/AICombatPhase";

export class AIStateMachine {

    private phase: AICombatPhase;

    constructor(initial: AICombatPhase) {
        this.phase = initial;
    }

    getPhase(): AICombatPhase {
        return this.phase;
    }

    canTransition(next: AICombatPhase): boolean {
        return AITransitions[this.phase]
            .includes(next);
    }

    transition(next: AICombatPhase): boolean {

        if (!this.canTransition(next)) {
            return false;
        }

        this.phase = next;
        return true;
    }
}