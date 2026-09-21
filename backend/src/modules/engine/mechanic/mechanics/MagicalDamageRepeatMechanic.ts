import { RepeatDamageBehavior } from "../behaviors/RepeatDamageBehavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class MagicalDamageRepeatMechanic extends MechanicDefinition {
    id = "17";
    name = "magical-damage-repeat";
    behavior = [new RepeatDamageBehavior()];
    abstractlistensTo = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = { requiredAttackType: "magico" };
}
