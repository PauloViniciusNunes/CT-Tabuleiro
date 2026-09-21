import { MechanicDefinition } from "./MechanicDefinition";
import { Behavior } from "../behaviors/Behavior";
import { MechanicEventType } from "../MechanicEventType";
import { Interceptor } from "../interceptors/Interceptor";
import { InterceptableData } from "../interceptors/Interceptor";
import { AccumulateDamageAsRollBonusBehavior } from "../behaviors/AccumulateDamageAsRollBonusBehavior";
import { AccumulatedRollBonusInterceptor } from "../interceptors/AccumulatedRollBonusInterceptor";
import { AccumulatedStrenghtRollBonusInterceptor } from "../interceptors/AccumulatedStrenghtRollBonusInterceptor";
import { AbsorveDamageBonusBehavior } from "../behaviors/AbsorveDamageBonusBehavior";


export class AbsorveDamageBonusMechanic extends MechanicDefinition {
    id: string = "21";
    name: string = "absorve-damage-bonus"
    behavior: Behavior[] = [new AbsorveDamageBonusBehavior()];
    // The bonus grows only after the owner has actually dealt damage.
    abstractlistensTo: MechanicEventType[] = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity: number = 1;
    defaultDuration?: number | undefined = 4;
    config?: Record<string, unknown> = {
        requiredAttackType: "fisico",
        accumulatedStrengthBonus: 0,
    };
    
    override interceptors: readonly Interceptor<InterceptableData>[] = [new AccumulatedStrenghtRollBonusInterceptor()];


}