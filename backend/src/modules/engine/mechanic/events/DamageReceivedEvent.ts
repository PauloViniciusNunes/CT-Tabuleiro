import { MechanicEventType } from "../MechanicEventType";
import type { DamageData } from "../../operators/DamageOperator";
import { MechanicEvent } from "./MechanicEvent";

export class DamageReceivedEvent extends MechanicEvent {
    readonly type = MechanicEventType.DAMAGE_RECEIVED;

    constructor(readonly damage: DamageData) {
        super();
    }
}
