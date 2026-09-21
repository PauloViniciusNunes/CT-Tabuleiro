import type { Behavior } from "../behaviors/Behavior";
import { CancelEnvironmentChangeInterceptor } from "../interceptors/CancelEnvironmentChangeInterceptor";
import type { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class SpellEnvironmentChangeDenialMechanic extends MechanicDefinition {
    id = "10";
    name = "spell-environment-change-denial";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity = 1;
    defaultDuration = 4;
    config: Record<string, unknown> = { deniedCause: "SPELL" };
    override readonly interceptors = [new CancelEnvironmentChangeInterceptor()];
}
