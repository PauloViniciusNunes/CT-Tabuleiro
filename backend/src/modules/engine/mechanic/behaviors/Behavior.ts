import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";

export abstract class Behavior {
    abstract lister() : MechanicEventType[]

    abstract execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
        data?: Record<string, unknown>
    ) : Promise<void>
}
