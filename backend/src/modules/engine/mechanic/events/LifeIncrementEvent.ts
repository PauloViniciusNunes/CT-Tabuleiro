import type { LifeIncrementData } from "../../operators/LifeIncrementOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class LifeIncrementEvent extends MechanicEvent {
    readonly type = MechanicEventType.LIFE_INCREMENT;

    constructor(readonly data: LifeIncrementData) {
        super();
    }
}
