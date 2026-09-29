import type { Behavior } from "../behaviors/Behavior";
import { ElementDamageMultiplierInterceptor } from "../interceptors/ElementDamageMultiplierInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Amplifies all fire-tagged damage dealt by its owner. */
export class FireAmplifierMechanic extends MechanicDefinition {
    id = "44";
    name = "fire-amplifier";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config: Record<string, unknown> = {
        requiredDamageElement: "fogo",
        damageMultiplier: 1.5,
        damageRounding: "ceil",
        damageModifierKey: "fire-amplifier",
    };
    override readonly interceptors = [new ElementDamageMultiplierInterceptor()];
}
