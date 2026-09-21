import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { GrantMagicWeaponBehavior } from "../behaviors/GrantMagicWeaponBehavior";
import { Interceptor } from "../interceptors/Interceptor";
import { ApplySpecialOcasionalAdditionInterceptor } from "../interceptors/ApplySpecialOcasionalAdditionInterceptor";
import { RemoveMagicWeaponBehavior } from "../behaviors/RemoveMagicWeaponBehavior";

export class MagicWeaponMechanic extends MechanicDefinition {
    id = "28";
    name = "magic-weapon";
    behavior = [new GrantMagicWeaponBehavior(), new RemoveMagicWeaponBehavior()];
    abstractlistensTo = [MechanicEventType.MECHANIC_APPLIED, MechanicEventType.MECHANIC_PRE_REMOVED];
    defaultIntensity = 1;
    defaultDuration = 16;
    config?: Record<string, unknown> = {
        alreadyExecute: false,
        ocasionalAddition: 0,
        itemCause: true,
        itemName: "Magic Weapon"
    };
    override readonly interceptors: readonly Interceptor[] = [new ApplySpecialOcasionalAdditionInterceptor()];

}
