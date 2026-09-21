import type { ActionData } from "../../operators/ActionDispatchOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class ActionDispatchedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ACTION_DISPATCH;

    constructor(readonly action: ActionData) {
        super();
    }
}
