import type { Behavior } from "../behaviors/Behavior";
import { HalfDamageInterceptor } from "../interceptors/HalfDamageInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class HalfDamageMechanic extends MechanicDefinition {
    id = "3";
    name = "half-damage";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown>;
    override readonly interceptors = [new HalfDamageInterceptor()];
}
