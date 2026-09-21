import { MechanicEventType } from "../MechanicEventType";

export abstract class MechanicEvent {
    abstract readonly type: MechanicEventType
}
