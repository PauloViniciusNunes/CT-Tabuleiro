import { SelfMaxLifeDamageOnFailedTestBehavior } from "../behaviors/SelfMaxLifeDamageOnFailedTestBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class SelfDestructionOnCharismaFailureMechanic extends MechanicDefinition {
    id = "16";
    name = "self-destruction-on-charisma-failure";
    behavior = [new SelfMaxLifeDamageOnFailedTestBehavior()];
    abstractlistensTo = [
        MechanicEventType.MECHANIC_APPLIED,
        MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
    ];
    defaultIntensity = 1;
    defaultDuration = 1;
    config: Record<string, unknown> = {
        requiredFailedAttribute: "carisma",
    };
}
