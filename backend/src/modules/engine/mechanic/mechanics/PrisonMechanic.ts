import type { Behavior } from "../behaviors/Behavior";
import { CancelVoluntaryMovementInterceptor } from "../interceptors/CancelVoluntaryMovementInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Prevents a target from taking voluntary movement actions. */
export class PrisonMechanic extends MechanicDefinition {
    id = "35";
    name = "prison";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override readonly interceptors = [
        new CancelVoluntaryMovementInterceptor(),
    ];
}
