import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { RegenerationInitTurnBehavior } from "../behaviors/RegenerationInitTurnBehavior";

export class BasicRegenerationMechanic extends MechanicDefinition {
    id = "42";
    name = "basic-regeneration";
    behavior = [new RegenerationInitTurnBehavior()];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown> | undefined;
}