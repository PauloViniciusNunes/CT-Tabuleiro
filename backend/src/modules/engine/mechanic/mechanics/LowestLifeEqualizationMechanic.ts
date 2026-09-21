import { EqualizeLowestResourceBehavior } from "../behaviors/EqualizeLowestResourceBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class LowestLifeEqualizationMechanic extends MechanicDefinition {
    id = "12";
    name = "lowest-life-equalization";
    behavior = [new EqualizeLowestResourceBehavior()];
    abstractlistensTo = [
        MechanicEventType.MECHANIC_APPLIED,
        MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
    ];
    defaultIntensity = 1;
    defaultDuration = 1;
    config: Record<string, unknown> = {
        resource: "life",
        requiredFailedAttribute: "inteligencia",
    };
}
