import type { Behavior } from "../behaviors/Behavior";
import { DisvantageAttributeTestInterceptor } from "../interceptors/DisvantageAttributeTestInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class DisvantageDexterityTestMechanic extends MechanicDefinition {
    id = "37";
    name = "disvantage-dexterity-test";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override readonly interceptors = [
        new DisvantageAttributeTestInterceptor("destreza"),
    ];
}
