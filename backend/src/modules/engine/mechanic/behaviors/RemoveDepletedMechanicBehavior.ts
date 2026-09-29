import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import { MechanicResourceDepletedEvent } from "../events/MechanicResourceDepletedEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Removes its mechanic when an operator reports its virtual resource depleted. */
export class RemoveDepletedMechanicBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.MECHANIC_RESOURCE_DEPLETED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
    ): Promise<void> {
        if (!(event instanceof MechanicResourceDepletedEvent)) return;
        if (!event.mechanicIds.includes(mechanic.id)) return;

        await context.operations.removeMechanic(
            mechanic.id,
            "virtual-resource-depleted",
        );
    }
}
