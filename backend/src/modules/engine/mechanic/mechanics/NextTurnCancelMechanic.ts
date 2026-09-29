import type { Behavior } from "../behaviors/Behavior";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Consumed by the turn service when the affected token would start its turn. */
export class NextTurnCancelMechanic extends MechanicDefinition {
    id = "38";
    name = "next-turn-cancel";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config: Record<string, unknown> = {
        cancelNextTurn: true,
    };
}
