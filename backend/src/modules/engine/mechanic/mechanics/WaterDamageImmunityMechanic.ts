import type { Behavior } from "../behaviors/Behavior";
import { ElementalDamageImmunityInterceptor } from "../interceptors/ElementalDamageImmunityInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

/** Grants immunity to water damage while its arsenal requirement is met. */
export class WaterDamageImmunityMechanic extends MechanicDefinition {
    id = "6";
    name = "water-damage-immunity";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = {
        requiredArsenalElement: "fogo",
        immuneDamageElements: ["agua"],
    };
    override readonly interceptors = [new ElementalDamageImmunityInterceptor()];
}
