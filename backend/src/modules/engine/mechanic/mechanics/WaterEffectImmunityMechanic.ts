import type { Behavior } from "../behaviors/Behavior";
import { MechanicTagImmunityInterceptor } from "../interceptors/MechanicTagImmunityInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Prevents water mechanics from being attached while its arsenal requirement is met. */
export class WaterEffectImmunityMechanic extends MechanicDefinition {
    id = "7";
    name = "water-effect-immunity";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredArsenalElement: "fogo",
        immuneMechanicTags: ["agua"],
    };
    override readonly interceptors = [new MechanicTagImmunityInterceptor()];
}
