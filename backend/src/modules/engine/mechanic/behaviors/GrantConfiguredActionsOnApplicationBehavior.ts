import { MechanicEventType } from "../MechanicEventType";
import { MechanicAppliedEvent } from "../events/MechanicAppliedEvent";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Grants `actionsIncrement` when its own MechanicInstance is applied. */
export class GrantConfiguredActionsOnApplicationBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.MECHANIC_APPLIED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
    ): Promise<void> {
        if (!(event instanceof MechanicAppliedEvent)) return;
        if (event.application.instance?.id !== mechanic.id) return;

        const configuredAmount = mechanic.metadata.actionsIncrement;
        if (
            typeof configuredAmount !== "number" ||
            !Number.isInteger(configuredAmount) ||
            configuredAmount <= 0
        ) {
            return;
        }

        const targetTokenId = typeof mechanic.metadata.targetId === "string"
            ? mechanic.metadata.targetId
            : mechanic.sourceTokenId;
        await context.operations.actionIncrement({
            sourceTokenId: mechanic.sourceTokenId,
            targetTokenId,
            amount: configuredAmount,
            cause: "MECHANIC_ACTION_GRANT",
            metadata: { mechanicInstanceId: mechanic.id },
        });

        if (mechanic.metadata.consumeAfterActionGrant !== false) {
            await context.operations.removeMechanic(mechanic.id, "actions-granted");
        }
    }
}
