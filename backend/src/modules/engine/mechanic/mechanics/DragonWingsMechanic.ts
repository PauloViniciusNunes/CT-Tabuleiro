import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { VisualOverlay } from "../types/visualOverlays";
import { Interceptor } from "../interceptors/Interceptor";
import { AccumulatedDexterityRollBonusInterceptor } from "../interceptors/AccumulatedDexterityRollBonusInterceptor";
import { IncrementMultiplierDexterityBehavior } from "../behaviors/IncrementMultiplierDexterityBehavior";
import { AreaDamageWhenMovingBehavior } from "../behaviors/AreaDamageWhenMovingBehavior";

export class DragonWingsMechanic extends MechanicDefinition {
    id = "29";
    name = "dragon-wings";
    behavior = [new IncrementMultiplierDexterityBehavior(), new AreaDamageWhenMovingBehavior()];
    abstractlistensTo = [MechanicEventType.MECHANIC_APPLIED, MechanicEventType.TOKEN_MOVED];
    defaultIntensity = 1;
    defaultDuration = 8;
    config: Record<string, unknown> = {
        distanceToDamage: 1,
        incrementMultiplier: 3,
        damageToLevelMultiplier: 10,
        accumulatedDexterityBonus: 0
    };
    override readonly interceptors: readonly Interceptor[] = [new AccumulatedDexterityRollBonusInterceptor()];

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "dragon-wings-mechanic",
            size: 7,
            offset: 0,
            gifPath: "https://res.cloudinary.com/tkm8lvqs/image/upload/v1789848644/Dragon-Wings-Transparent.png",
        }
    }    
}
