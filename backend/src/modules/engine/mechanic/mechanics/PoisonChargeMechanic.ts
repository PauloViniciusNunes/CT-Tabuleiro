import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { ApplyOrAccumulateMechanicOnDamageBehavior } from "../behaviors/ApplyOrAccumulateMechanicOnDamageBehavior";
import { Interceptor } from "../interceptors/Interceptor";
import { TargetMechanicResistanceInterceptor } from "../interceptors/TargetMechanicResistanceInterceptor";

export class PoisonChargeMechanic extends MechanicDefinition {
    id = "32";
    name = "posion-charge";
    behavior = [new ApplyOrAccumulateMechanicOnDamageBehavior()];
    abstractlistensTo = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity = 1;
    defaultDuration = 8;
    config?: Record<string, unknown> = {
        mechanicApplyTag: "veneno",
        requiredAttackType: "magico",
        requiredCardDamage: true,
        minimumResistanceGrade: 1,
        sourceLevelIntensity: {
            levelOffset: 6,
            minimumLevel: 1,
            multiplier: 10,
        },
    };
    override readonly interceptors: readonly Interceptor[] = [
        new TargetMechanicResistanceInterceptor(),
    ];

}
