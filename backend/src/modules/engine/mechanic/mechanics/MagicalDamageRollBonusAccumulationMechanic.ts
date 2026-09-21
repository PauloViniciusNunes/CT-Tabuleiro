import { AccumulateDamageAsRollBonusBehavior } from "../behaviors/AccumulateDamageAsRollBonusBehavior";
import { AccumulatedRollBonusInterceptor } from "../interceptors/AccumulatedRollBonusInterceptor";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class MagicalDamageRollBonusAccumulationMechanic extends MechanicDefinition {
    id = "18";
    name = "magical-damage-roll-bonus-accumulation";
    behavior = [new AccumulateDamageAsRollBonusBehavior()];
    abstractlistensTo = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredAttackType: "magico",
        accumulatedRollBonus: 0,
        rollBonusMetadataKey: "accumulatedRollBonus",
        rollBonusModifierKey: "magical-damage-roll-bonus",
    };
    override readonly interceptors = [new AccumulatedRollBonusInterceptor()];
}
