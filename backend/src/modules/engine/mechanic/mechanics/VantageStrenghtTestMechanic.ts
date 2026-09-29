import type { Behavior } from "../behaviors/Behavior";
import { AttributeTestMultiplierInterceptor } from "../interceptors/AttributeTestMultiplierInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class VantageStrenghtTestMechanic extends MechanicDefinition {
    id = "39";
    name = "vantage-strenght-test";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override readonly interceptors = [
        new AttributeTestMultiplierInterceptor("forca", 2),
    ];
}
