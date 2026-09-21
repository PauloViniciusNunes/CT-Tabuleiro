import { ApplyMechanicOnDeniedEnvironmentBehavior } from "../behaviors/ApplyMechanicOnDeniedEnvironmentBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class BurnDeniedSpellCasterMechanic extends MechanicDefinition {
    id = "11";
    name = "burn-denied-spell-caster";
    behavior = [new ApplyMechanicOnDeniedEnvironmentBehavior()];
    abstractlistensTo = [MechanicEventType.ENVIRONMENT_CHANGE_DENIED];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredDeniedCause: "SPELL",
        appliedMechanicTag: "fogo",
        appliedIntensity: 1,
        appliedDuration: 1,
        amplifierArsenalElement: "fogo",
        amplifierMultiplier: 2,
    };
}
