import type { ActionIncrementData } from "../../operators/ActionIncrementOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class ActionIncrementEvent extends MechanicEvent {
    readonly type = MechanicEventType.ACTION_INCREMENT;

    constructor(readonly data: ActionIncrementData) {
        super();
    }
}
