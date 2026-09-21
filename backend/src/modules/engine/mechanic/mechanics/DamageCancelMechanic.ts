import { MechanicDefinition } from "./MechanicDefinition";
import { Interceptor } from "../interceptors/Interceptor";
import { CancelDamageFormularyInteceptor } from "../interceptors/CancelDamageFormularyInteceptor";

export class DamageCancelMechanic extends MechanicDefinition {
    id = "31";
    name = "damage-cancel";
    behavior = [];
    abstractlistensTo = [];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config: Record<string, unknown> = {
        cancelDamageCharges: 3
    };
    override readonly interceptors: readonly Interceptor[] = [new CancelDamageFormularyInteceptor()];
}
