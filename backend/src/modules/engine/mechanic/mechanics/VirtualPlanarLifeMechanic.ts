import type { Behavior } from "../behaviors/Behavior";
import { InitializeVirtualResourceBehavior } from "../behaviors/InitializeVirtualResourceBehavior";
import { RemoveDepletedMechanicBehavior } from "../behaviors/RemoveDepletedMechanicBehavior";
import { VirtualDamageResourceInterceptor } from "../interceptors/VirtualDamageResourceInterceptor";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";

export class VirtualPlanarLifeMechanic extends MechanicDefinition {
    id = "41";
    name = "virtual-planar-life";
    behavior: Behavior[] = [
        new InitializeVirtualResourceBehavior(),
        new RemoveDepletedMechanicBehavior(),
    ];
    abstractlistensTo: MechanicEventType[] = [
        MechanicEventType.MECHANIC_APPLIED,
        MechanicEventType.MECHANIC_RESOURCE_DEPLETED,
    ];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config: Record<string, unknown> = {
        virtualResourceSourceField: "maxLife",
        virtualResourceCurrentMetadataKey: "currentRedLife",
        virtualResourceMaxMetadataKey: "maxRedLife",
    };

    override readonly interceptors = [
        new VirtualDamageResourceInterceptor(),
    ];
}
