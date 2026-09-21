import type { MovementData } from "../../operators/MovementOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class TokenMovedEvent extends MechanicEvent {
    readonly type = MechanicEventType.TOKEN_MOVED;

    constructor(readonly movement: MovementData) {
        super();
    }
}
