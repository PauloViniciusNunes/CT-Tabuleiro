import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";
import { Interceptor, InterceptableData } from "../interceptors/Interceptor";
import { DarkenedDisvantageRollInterceptor } from "../interceptors/DarkenedDisvantageRollInterceptor";

export class DarkenedMechanic extends MechanicDefinition {
    id = "26";
    name = "darkened";
    behavior = [];
    abstractlistensTo = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown>;
    override readonly interceptors: readonly Interceptor<InterceptableData>[] = [new DarkenedDisvantageRollInterceptor()];

    //
    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "fire-mechanic",
            size: 1,
            offset: 0,
            gifPath: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExemtuY216NmEzaWJsODYyd3p0bHI5YXRueDhzODdnOHUyOTh0Z3ZmNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xZKTasvo4qW5ltQiGM/giphy.gif",
        }
    }    

}