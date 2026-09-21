import { FailedTestNextTurnBehavior } from "../behaviors/FailedTestNextTurnBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class NextTurnControlMechanic extends MechanicDefinition {
    id = "14";
    name = "next-turn-control";
    behavior = [new FailedTestNextTurnBehavior()];
    abstractlistensTo = [
        MechanicEventType.MECHANIC_APPLIED,
        MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
        MechanicEventType.TURN_INIT,
    ];
    defaultIntensity = 1;
    defaultDuration = 2;
    config: Record<string, unknown> = {
        requiredFailedAttribute: "inteligencia",
        controlsTarget: true,
        transientMechanicTag: "controle-proximo-turno",
    };
}
