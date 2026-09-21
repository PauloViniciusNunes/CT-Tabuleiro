import type { Behavior } from "../behaviors/Behavior";
import { ElementalAffinityDamageMultiplierInterceptor } from "../interceptors/ElementalAffinityDamageMultiplierInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Configures fire damage according to the target's fire affinity. */
export class FireDamageByAffinityMechanic extends MechanicDefinition {
    id = "9";
    name = "fire-damage-by-affinity";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredArsenalElement: "fogo",
        damageElement: "fogo",
        damageModifierKey: "fire-damage-by-affinity",
        neutralDamageMultiplier: 2,
        disadvantagedDamageMultiplier: 2,
        advantagedDamageMultiplier: 1,
    };
    override readonly interceptors = [
        new ElementalAffinityDamageMultiplierInterceptor(),
    ];
}
