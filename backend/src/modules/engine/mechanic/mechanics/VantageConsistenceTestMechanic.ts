import type { Behavior } from "../behaviors/Behavior";
import { AttributeTestMultiplierInterceptor } from "../interceptors/AttributeTestMultiplierInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class VantageConsistenceTestMechanic extends MechanicDefinition {
    id = "40";
    name = "vantage-consistence-test";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override readonly interceptors = [
        new AttributeTestMultiplierInterceptor("consistencia", 2),
    ];
}
