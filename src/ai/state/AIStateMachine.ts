import type { AICombatPhase } from "../../types/ai/AICombatPhase";

export class AIStateMachine {

    private phase: AICombatPhase;

    constructor(initial: AICombatPhase) {
        this.phase = initial;
    }

    getPhase(): AICombatPhase {
        return this.phase;
    }



    transition(next: AICombatPhase): boolean {
        this.phase = next;
        return true;
    }
}