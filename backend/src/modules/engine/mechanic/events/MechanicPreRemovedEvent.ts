import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

/**
 * Dispatched while the instance is still active, immediately before its
 * removal. Behaviors can use it for cleanup, transfer or final effects.
 */
export class MechanicPreRemovedEvent extends MechanicEvent {
    readonly type = MechanicEventType.MECHANIC_PRE_REMOVED;

    constructor(
        readonly mechanic: Readonly<MechanicInstance>,
        readonly reason: string,
    ) {
        super();
    }
}
