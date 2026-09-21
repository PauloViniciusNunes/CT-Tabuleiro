import type { RollData } from "../../operators/RollOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class RollResolvedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ROLL_RESOLVED;

    constructor(readonly roll: RollData) {
        super();
    }
}
