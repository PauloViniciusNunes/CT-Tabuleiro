import { ActionType } from "../../context/ActionType";
import type { ActionData } from "../../operators/ActionDispatchOperator";
import { isInAttackRange } from "../../utils/calculations";
import {
    EXTRA_ATTACK_CONFIRMATION_HANDLER_KEY,
    ensureExtraAttackConfirmationHandlerRegistered,
} from "../../special-response/handlers/ExtraAttackConfirmationHandler";
import { SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY } from "../../special-response/types";
import { MechanicEventType } from "../MechanicEventType";
import { ActionDispatchRequestedEvent } from "../events/ActionDispatchRequestedEvent";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

const ATTACK_ACTION_TYPES = new Set<ActionType>([
    ActionType.ATTACK,
    ActionType.SURPRISE,
    ActionType.DISORIENT,
    ActionType.PREDICT,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function configuredExtraAttacks(mechanic: Readonly<MechanicInstance>): number {
    const amount = mechanic.metadata.extraAttacks;
    return typeof amount === "number" &&
        Number.isInteger(amount) &&
        amount > 0
        ? amount
        : 0;
}

function isPhysicalAttack(action: Readonly<ActionData>): boolean {
    const attribute = action.choice.attribute;
    return attribute === "forca" || attribute === "destreza";
}

function hasTarget(action: Readonly<ActionData>): boolean {
    return typeof action.choice.targetId === "string" && Boolean(action.choice.targetId);
}

function isPhysicalTargetWithinRange(
    context: Readonly<EngineContext>,
    action: Readonly<ActionData>,
): boolean {
    const targetTokenId = action.choice.targetId;
    if (typeof targetTokenId !== "string" || targetTokenId === action.sourceTokenId) {
        return false;
    }

    const source = context.boardTokens.find(
        (token) => isRecord(token) && token.id === action.sourceTokenId,
    );
    const target = context.boardTokens.find(
        (token) => isRecord(token) && token.id === targetTokenId,
    );

    return Boolean(source && target && isInAttackRange(source, target, "fisico"));
}

function isContinuationForMechanic(
    action: Readonly<ActionData>,
    mechanicInstanceId: string,
): boolean {
    const continuation = action.metadata?.[SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY];
    return isRecord(continuation) &&
        continuation.mechanicInstanceId === mechanicInstanceId;
}

/**
 * Offers a once-per-turn, configurable attack-quantity bonus before a
 * targeted physical attack. The mechanic owns only configuration; this
 * behavior is reusable by any mechanic that defines `extraAttacks` and
 * `canUsage` metadata.
 */
export class OptionalExtraAttackBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [
            MechanicEventType.TURN_INIT,
            MechanicEventType.ACTION_DISPATCH_REQUESTED,
        ];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
    ): Promise<void> {
        if (event.type === MechanicEventType.TURN_INIT) {
            await this.resetUsageAtOwnerTurnStart(context, mechanic);
            return;
        }

        if (!(event instanceof ActionDispatchRequestedEvent)) return;

        const action = event.action;
        if (
            mechanic.metadata.canUsage !== true ||
            configuredExtraAttacks(mechanic) <= 0 ||
            action.sourceTokenId !== mechanic.sourceTokenId ||
            !ATTACK_ACTION_TYPES.has(action.actionType) ||
            !hasTarget(action) ||
            !isPhysicalAttack(action) ||
            !isPhysicalTargetWithinRange(context, action) ||
            isContinuationForMechanic(action, mechanic.id)
        ) {
            return;
        }

        ensureExtraAttackConfirmationHandlerRegistered();
        const extraAttacks = configuredExtraAttacks(mechanic);
        await context.specialResponses.request({
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: mechanic.sourceTokenId,
            title: "Ataques extras",
            description:
                `Confirme para adicionar ${extraAttacks} ataques a esta rolagem.`,
            fields: [],
            handlerKey: EXTRA_ATTACK_CONFIRMATION_HANDLER_KEY,
            context: {
                actionType: action.actionType,
                sourceTokenId: action.sourceTokenId,
                targetTokenId: action.choice.targetId,
                mechanicInstanceId: mechanic.id,
                choice: action.choice,
                actionMetadata: action.metadata ?? {},
                parentOperationId: action.operationId,
            },
        });
    }

    private async resetUsageAtOwnerTurnStart(
        context: EngineContext,
        mechanic: Readonly<MechanicInstance>,
    ): Promise<void> {
        if (
            context.currentTokenId !== mechanic.sourceTokenId ||
            mechanic.metadata.canUsage === true ||
            configuredExtraAttacks(mechanic) <= 0
        ) {
            return;
        }

        const { BattleSetter } = await import("../../context/BattleSetter");
        await new BattleSetter().updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => ({
                ...current,
                metadata: {
                    ...current.metadata,
                    canUsage: true,
                },
            }),
        );
    }
}
