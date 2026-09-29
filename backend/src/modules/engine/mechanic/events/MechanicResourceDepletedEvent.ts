import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

/** Signals that one or more mechanic-owned virtual resources reached zero. */
export class MechanicResourceDepletedEvent extends MechanicEvent {
    readonly type = MechanicEventType.MECHANIC_RESOURCE_DEPLETED;

    constructor(readonly mechanicIds: readonly string[]) {
        super();
    }
}
