import { profileHasElement } from "../../utils/elementalAffinity";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Applies a configured mechanic to the source of a denied environment operation. */
export class ApplyMechanicOnDeniedEnvironmentBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.ENVIRONMENT_CHANGE_DENIED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        _event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {
        
        const environment = data?.environment;
        if (!environment || typeof environment !== "object") return;

        const operation = environment as {
            cause?: unknown;
            operationId?: unknown;
            sourceTokenId?: unknown;
            sourceToken?: Parameters<typeof profileHasElement>[0];
        };
        const requiredCause = mechanic.metadata.requiredDeniedCause;
        if (typeof requiredCause === "string" && operation.cause !== requiredCause){ 
            console.log("RETORNO 1")
            return
        }
        if (!data.sourceTokenId || typeof data.sourceTokenId !== "string") {
            console.log("TIPO: ", typeof operation.sourceTokenId)
            return
        }

        const appliedMechanicTag = mechanic.metadata.appliedMechanicTag;
        if (typeof appliedMechanicTag !== "string") return;

        const baseIntensity = typeof mechanic.metadata.appliedIntensity === "number"
            ? mechanic.metadata.appliedIntensity
            : 1;
        const amplifierElement = mechanic.metadata.amplifierArsenalElement;
        const multiplier = typeof mechanic.metadata.amplifierMultiplier === "number"
            ? mechanic.metadata.amplifierMultiplier
            : 1;
        const amplified = typeof amplifierElement === "string" &&
            profileHasElement(operation.sourceToken, amplifierElement);

        await context.operations.applyMechanic({
            sourceTokenId: data.sourceTokenId,
            tag: appliedMechanicTag,
            parentOperationId: typeof operation.operationId === "string"
                ? operation.operationId
                : undefined,
            cause: "DENIED_ENVIRONMENT_CHANGE",
            mechanicMetadata: {
                targetId: data.sourceTokenId,
                intensity: baseIntensity * (amplified ? multiplier : 1),
                duration: typeof mechanic.metadata.appliedDuration === "number"
                    ? mechanic.metadata.appliedDuration
                    : 1,
                instigatorTokenId: mechanic.sourceTokenId,
            },
        });
    }
}
