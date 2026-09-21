import { AccumulatedStrengthBonusBehavior } from "../behaviors/AccumulatedStrengthBonusBehavior";
import { Behavior } from "../behaviors/Behavior";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { VisualOverlay } from "../types/visualOverlays";
import { Interceptor, InterceptableData } from "../interceptors/Interceptor";
import { AccumulatedStrengthBonusInterceptor } from "../interceptors/AccumulatedStrengthBonusInterceptor";
import { INITIAL_ACCUMULATED_STRENGTH_BONUS } from "../constants/accumulatedStrengthBonus";

export class AccumulatedStrenghtBonusMechanic extends MechanicDefinition {
    id: string = "5";
    name: string = "accumulated-strenght"
    behavior: Behavior[] = [new AccumulatedStrengthBonusBehavior()];
    // The bonus grows only after the owner has actually dealt damage.
    abstractlistensTo: MechanicEventType[] = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity: number = 1;
    defaultDuration?: number | undefined = 4;
    config?: Record<string, unknown> = {
        accumulatedStrengthBonus: INITIAL_ACCUMULATED_STRENGTH_BONUS,
    };
    
    override interceptors: readonly Interceptor<InterceptableData>[] = [new AccumulatedStrengthBonusInterceptor()];

    //https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3VsdTRzYjdxYWxlODJyOTY3MnZma2ZhdmplbXdvbWpkMWM3eHB3eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/I9vZ4cFaR4b2cq9G39/giphy.gif
    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "accumulated.strenght-mechanic",
            size: 1.2,
            offset: 0,
            gifPath: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3VsdTRzYjdxYWxlODJyOTY3MnZma2ZhdmplbXdvbWpkMWM3eHB3eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/I9vZ4cFaR4b2cq9G39/giphy.gif",
        }
    }    

}
