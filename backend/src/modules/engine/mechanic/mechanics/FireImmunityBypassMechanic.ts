import type { Behavior } from "../behaviors/Behavior";
import { ElementalImmunityBypassInterceptor } from "../interceptors/ElementalImmunityBypassInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Allows fire damage to pass through fire-specific immunity. */
export class FireImmunityBypassMechanic extends MechanicDefinition {
    id = "8";
    name = "fire-immunity-bypass";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredArsenalElement: "fogo",
        bypassImmunityElements: ["fogo"],
    };
    override readonly interceptors = [new ElementalImmunityBypassInterceptor()];
}
