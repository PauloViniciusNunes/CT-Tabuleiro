import { MechanicDefinition } from "./MechanicDefinition";
import { Behavior } from "../behaviors/Behavior";
import { MechanicEventType } from "../MechanicEventType";
import { Interceptor } from "../interceptors/Interceptor";
import { InterceptableData } from "../interceptors/Interceptor";
import { AccumulateDamageAsRollBonusBehavior } from "../behaviors/AccumulateDamageAsRollBonusBehavior";
import { AccumulatedRollBonusInterceptor } from "../interceptors/AccumulatedRollBonusInterceptor";
import { AccumulatedStrenghtRollBonusInterceptor } from "../interceptors/AccumulatedStrenghtRollBonusInterceptor";
import { AbsorveDamageBonusBehavior } from "../behaviors/AbsorveDamageBonusBehavior";
import { IncreasePenaltiesLifeAndAttributes } from "../behaviors/IncreasePenaltiesLifeAndAttributes";
import { RollPenaltyInterceptor } from "../interceptors/RollPenaltyInterceptor";

// Fica no alvo
export class BloodDrainMechanic extends MechanicDefinition {
    id: string = "22";
    name: string = "blood-drain"
    behavior: Behavior[] = [new IncreasePenaltiesLifeAndAttributes()];
    // The bonus grows only after the owner has actually dealt damage.
    abstractlistensTo: MechanicEventType[] = [MechanicEventType.TURN_INIT];
    defaultIntensity: number = 1;
    defaultDuration?: number | undefined = undefined;
    config?: Record<string, unknown> = {
        penaltyRate: 0,
        attributesDecrease: [
            "forca",
            "consistencia",
            "destreza",
            "inteligencia"
        ]
    };
    
    override interceptors: readonly Interceptor<InterceptableData>[] = [new RollPenaltyInterceptor];

}