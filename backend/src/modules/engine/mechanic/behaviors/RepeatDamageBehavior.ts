import { Debug } from "@prisma/client/runtime/library";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { Debugger } from "../../utils/Debug";

/** Replays a damage operation while preserving provenance and preventing recursion. */
export class RepeatDamageBehavior extends Behavior {
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
            baseAmount?: unknown;
            sourceTokenId?: unknown;
            targetTokenId?: unknown;
            element?: unknown;
            operationId?: unknown;
            cause?: unknown;
            metadata?: Readonly<Record<string, unknown>>;
        };

        console.log("[DISPARADO A]: RepeatDamageBehavior",)



        const requiredAttackType = mechanic.metadata.requiredAttackType;


        Debugger.display("TIPO DE ATAQUE", damage.metadata?.attackType)
        Debugger.display("ATAQUE REQUERIDO", requiredAttackType)

        if (
            damage.sourceTokenId !== mechanic.sourceTokenId ||
            typeof damage.targetTokenId !== "string" ||
            typeof damage.amount !== "number" ||
            damage.amount <= 0 ||
            damage.cause === "REPEATED_DAMAGE" ||
            (typeof requiredAttackType === "string" &&
                damage.metadata?.attackType !== requiredAttackType)
        ) return;

        console.log("[PASSANDO]: Está passando?")

        await context.operations.damage({
            sourceTokenId: mechanic.sourceTokenId,
            targetTokenId: damage.targetTokenId,
            amount: typeof damage.baseAmount === "number"
                ? damage.baseAmount
                : damage.amount,
            element: typeof damage.element === "string" ? damage.element : undefined,
            parentOperationId: typeof damage.operationId === "string"
                ? damage.operationId
                : undefined,
            cause: "REPEATED_DAMAGE",
            metadata: { ...(damage.metadata ?? {}), repeatedByMechanicId: mechanic.id },
        });
    }
}
