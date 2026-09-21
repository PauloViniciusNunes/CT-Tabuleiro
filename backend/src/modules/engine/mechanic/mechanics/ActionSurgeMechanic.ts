import { GrantConfiguredActionsOnApplicationBehavior } from "../behaviors/GrantConfiguredActionsOnApplicationBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Consumable mechanic that grants an immediate extra battle action. */
export class ActionSurgeMechanic extends MechanicDefinition {
    id = "34";
    name = "action-surge";
    behavior = [new GrantConfiguredActionsOnApplicationBehavior()];
    abstractlistensTo = [MechanicEventType.MECHANIC_APPLIED];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config: Record<string, unknown> = {
        actionsIncrement: 1,
        consumeAfterActionGrant: true,
    };
}
