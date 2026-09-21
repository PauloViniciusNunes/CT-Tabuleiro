import { BattleSetter } from "../../context/BattleSetter";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { isOwnApplication, matchesFailedTest } from "./failedTestMetadata";

/** Activates an effect exactly during the affected target's next turn. */
export class FailedTestNextTurnBehavior extends Behavior {
    constructor(private readonly battleSetter = new BattleSetter()) {
        super();
    }

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
            MechanicEventType.MECHANIC_APPLIED,
            MechanicEventType.TURN_INIT,
        ];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {
        if (
            event.type === MechanicEventType.ATTRIBUTE_TEST_RESOLVED &&
            mechanic.metadata.passive === true
        ) {
            const test = data?.test;
            if (!test || typeof test !== "object") return;
            const resolution = test as {
                resolutionId?: unknown;
                cardId?: unknown;
                sourceTokenId?: unknown;
                targetTokenId?: unknown;
                attribute?: unknown;
                succeeded?: unknown;
            };
            const tag = mechanic.metadata.transientMechanicTag;
            if (
                resolution.sourceTokenId !== mechanic.sourceTokenId ||
                resolution.succeeded !== false ||
                resolution.attribute !== mechanic.metadata.requiredFailedAttribute ||
                typeof resolution.targetTokenId !== "string" ||
                typeof tag !== "string"
            ) return;

            await context.operations.applyMechanic({
                sourceTokenId: mechanic.sourceTokenId,
                tag,
                cause: "FAILED_ATTRIBUTE_TEST",
                mechanicMetadata: {
                    targetId: resolution.targetTokenId,
                    resolutionId: resolution.resolutionId,
                    cardId: resolution.cardId,
                    testAttribute: resolution.attribute,
                    testSucceeded: false,
                    passive: false,
                },
            });
            return;
        }

        if (event.type === MechanicEventType.MECHANIC_APPLIED) {
            if (isOwnApplication(mechanic, data) && !matchesFailedTest(mechanic)) {
                await context.operations.removeMechanic(
                    mechanic.id,
                    "failed-test-not-matched",
                );
            }
            return;
        }

        const targetId = mechanic.metadata.targetId;
        if (typeof targetId !== "string" || !matchesFailedTest(mechanic)) return;

        if (mechanic.metadata.nextTurnActive === true) {
            if (context.currentTokenId !== targetId) {
                await context.operations.removeMechanic(
                    mechanic.id,
                    "next-turn-window-ended",
                );
            }
            return;
        }

        if (context.currentTokenId === targetId) {
            await this.battleSetter.updateMechanicInstance(
                context.battleId,
                mechanic.id,
                (current) => ({
                    ...current,
                    metadata: { ...current.metadata, nextTurnActive: true },
                }),
            );
        }
    }
}
