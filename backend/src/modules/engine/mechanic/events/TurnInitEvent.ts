import { MechanicEvent } from "./MechanicEvent";

import { MechanicEventType } from "../MechanicEventType";

export class TurnInitEvent extends MechanicEvent {
    type = MechanicEventType.TURN_INIT
}