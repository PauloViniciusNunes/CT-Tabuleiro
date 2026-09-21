import type { ActionData } from "../../operators/ActionDispatchOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

/** Emitted after action interception, but before the action spends any resource. */
export class ActionDispatchRequestedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ACTION_DISPATCH_REQUESTED;

    constructor(readonly action: ActionData) {
        super();
    }
}
