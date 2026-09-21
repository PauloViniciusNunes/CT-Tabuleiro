import { ManaIncrementData } from "../../operators/ManaIncrementOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class ManaIncrementEvent extends MechanicEvent {
    type: MechanicEventType = MechanicEventType.MANA_INCREMENT;

    constructor(readonly data: ManaIncrementData) {
        super()
    }
}