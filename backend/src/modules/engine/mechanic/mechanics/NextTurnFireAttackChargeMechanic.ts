import { ApplyMechanicOnDamageBehavior } from "../behaviors/ApplyMechanicOnDamageBehavior";
import { FailedTestNextTurnBehavior } from "../behaviors/FailedTestNextTurnBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class NextTurnFireAttackChargeMechanic extends MechanicDefinition {
    id = "15";
    name = "next-turn-fire-attack-charge";
    behavior = [
        new FailedTestNextTurnBehavior(),
        new ApplyMechanicOnDamageBehavior(),
    ];
    abstractlistensTo = [
        MechanicEventType.MECHANIC_APPLIED,
        MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
        MechanicEventType.TURN_INIT,
        MechanicEventType.DAMAGE_RECEIVED,
    ];
    defaultIntensity = 1;
    defaultDuration = 2;
    config: Record<string, unknown> = {
        requiredFailedAttribute: "inteligencia",
        appliedMechanicTag: "fogo",
        appliedIntensity: 1,
        appliedDuration: 1,
        transientMechanicTag: "carga-fogo-proximo-turno",
    };
}
