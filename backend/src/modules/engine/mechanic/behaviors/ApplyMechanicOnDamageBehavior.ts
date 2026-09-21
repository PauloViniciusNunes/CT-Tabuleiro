import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Applies a configured mechanic when the affected token deals matching damage. */
export class ApplyMechanicOnDamageBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.DAMAGE_RECEIVED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        _event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {
        const operation = data?.operation;
        if (!operation || typeof operation !== "object") return;
        const damage = operation as {
            amount?: unknown;
            sourceTokenId?: unknown;
            targetTokenId?: unknown;
            operationId?: unknown;
            cause?: unknown;
            metadata?: Readonly<Record<string, unknown>>;
        };
        const affectedTokenId = mechanic.metadata.targetId ?? mechanic.sourceTokenId;
        const requiredAttackType = mechanic.metadata.requiredAttackType;
        if (
            mechanic.metadata.nextTurnActive !== true ||
            damage.sourceTokenId !== affectedTokenId ||
            typeof damage.targetTokenId !== "string" ||
            typeof damage.amount !== "number" ||
            damage.amount <= 0 ||
            damage.cause === "REPEATED_DAMAGE" ||
            (typeof requiredAttackType === "string" &&
                damage.metadata?.attackType !== requiredAttackType)
        ) return;

        const tag = mechanic.metadata.appliedMechanicTag;
        if (typeof tag !== "string") return;

        await context.operations.applyMechanic({
            sourceTokenId: affectedTokenId as string,
            tag,
            parentOperationId: typeof damage.operationId === "string"
                ? damage.operationId
                : undefined,
            cause: "DAMAGE_ADDITIONAL_CHARGE",
            mechanicMetadata: {
                targetId: damage.targetTokenId,
                intensity: typeof mechanic.metadata.appliedIntensity === "number"
                    ? mechanic.metadata.appliedIntensity
                    : mechanic.intensity,
                duration: typeof mechanic.metadata.appliedDuration === "number"
                    ? mechanic.metadata.appliedDuration
                    : 1,
            },
        });
    }
}
