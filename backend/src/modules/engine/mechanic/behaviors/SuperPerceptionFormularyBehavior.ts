import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { ActionType } from "../../context/ActionType";
import type { ActionData } from "../../operators/ActionDispatchOperator";
import {
    ensureProficiencyRollReductionHandlerRegistered,
    PROFICIENCY_ROLL_REDUCTION_HANDLER_KEY,
} from "../../special-response/handlers/ProficiencyRollReductionHandler";
import { SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY } from "../../special-response/types";
import { ActionDispatchRequestedEvent } from "../events/ActionDispatchRequestedEvent";

const TARGETED_ATTACK_TYPES = new Set<ActionType>([
    ActionType.ATTACK,
    ActionType.SURPRISE,
    ActionType.DISORIENT,
    ActionType.PREDICT,
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isContinuationForMechanic(
    action: ActionData,
    mechanicInstanceId: string,
): boolean {
    const continuation = action.metadata?.[SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY];
    return isRecord(continuation) &&
        continuation.mechanicInstanceId === mechanicInstanceId;
}

export class SuperPerceptionFormularyBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.ACTION_DISPATCH_REQUESTED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
    ): Promise<void> {
        if (!(event instanceof ActionDispatchRequestedEvent)) return;

        const action = event.action;
        const targetTokenId = action.choice.targetId;
        
        if (
            !TARGETED_ATTACK_TYPES.has(action.actionType) ||
            targetTokenId !== mechanic.sourceTokenId ||
            action.sourceTokenId === mechanic.sourceTokenId ||
            isContinuationForMechanic(action, mechanic.id)
        ) return;

        const responder = context.boardTokens.find((token) =>
            isRecord(token) && token.id === mechanic.sourceTokenId
        );
        if (!isRecord(responder)) return;

        const currentMana = responder.currentMana;
        if (
            typeof currentMana !== "number" ||
            !Number.isFinite(currentMana) ||
            currentMana < 1
        ) return;

        ensureProficiencyRollReductionHandlerRegistered();
        await context.specialResponses.request({
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: action.sourceTokenId,
            title: "Super Percepção",
            description:
                "Escolha quantos pontos de mana gastar. Cada ponto reduz da rolagem inimiga uma vez a sua proficiência.",
            fields: [{
                id: "spentMana",
                label: "Pontos de mana",
                type: "number",
                min: 1,
                max: Math.floor(currentMana),
                step: 1,
                integer: true,
                defaultValue: 1,
            }],
            handlerKey: PROFICIENCY_ROLL_REDUCTION_HANDLER_KEY,
            context: {
                actionType: action.actionType,
                sourceTokenId: action.sourceTokenId,
                targetTokenId: mechanic.sourceTokenId,
                mechanicInstanceId: mechanic.id,
                choice: action.choice,
                actionMetadata: action.metadata ?? {},
                parentOperationId: action.operationId,
            },
        });
    }
}
