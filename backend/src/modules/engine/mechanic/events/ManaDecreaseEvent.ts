import { ManaDecreaseData } from "../../operators/ManaDecreaseOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class ManaDecreaseEvent extends MechanicEvent {
    type: MechanicEventType = MechanicEventType.MANA_DECREASE;

    constructor(readonly data: ManaDecreaseData) {
        super()
    }
}