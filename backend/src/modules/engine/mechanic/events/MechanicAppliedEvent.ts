import type { MechanicApplicationData } from "../../operators/MechanicApplicationOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class MechanicAppliedEvent extends MechanicEvent {
    readonly type = MechanicEventType.MECHANIC_APPLIED;

    constructor(readonly application: MechanicApplicationData) {
        super();
    }
}
