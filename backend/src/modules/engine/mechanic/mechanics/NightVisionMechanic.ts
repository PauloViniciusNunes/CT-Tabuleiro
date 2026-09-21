import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";
import { Interceptor, InterceptableData } from "../interceptors/Interceptor";
import { DarkenedDisvantageRollInterceptor } from "../interceptors/DarkenedDisvantageRollInterceptor";

export class NightVisionMechanic extends MechanicDefinition {
    id = "27";
    name = "night-vision";
    behavior = [];
    abstractlistensTo = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown>;
    override readonly interceptors: readonly Interceptor<InterceptableData>[] = [];

}