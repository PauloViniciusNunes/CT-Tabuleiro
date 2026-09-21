import { MechanicDefinition } from "./MechanicDefinition";
import { RepeatDamageBehavior } from "../behaviors/RepeatDamageBehavior";
import { MechanicEventType } from "../MechanicEventType";

export class PhysicalDamageRepeatMechanic extends MechanicDefinition {
    id = "20";
    name = "physical-damage-repeat";
    behavior = [new RepeatDamageBehavior()];
    abstractlistensTo = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = { requiredAttackType: "fisico" };    
}