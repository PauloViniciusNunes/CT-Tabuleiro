import type { LifeDecreaseData } from "../../operators/LifeDecreaseOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class LifeDecreaseEvent extends MechanicEvent {
    readonly type = MechanicEventType.LIFE_DECREASE;

    constructor(readonly data: LifeDecreaseData) {
        super();
    }
}
