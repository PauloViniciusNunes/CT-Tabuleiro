import { ActionType } from "../../context/ActionType";
import { OperatorType } from "../../operators/OperatorType";
import { SpecialResponseHandlerRegistry } from "../../special-response/SpecialResponseHandlerRegistry";
import { SpecialResponseRequestService } from "../../special-response/SpecialResponseRequestService";
import {
    SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY,
    type SpecialResponseHandlerContext,
} from "../../special-response/types";
import type { ActionData, ActionDispatchInput } from "../../operators/ActionDispatchOperator";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import type { MechanicInstance } from "../mechanics/MechanicInstance";

export const CANCEL_ACTION_FORMULARY_HANDLER_KEY = "action.cancel-and-apply.formulary.v1";
export const CANCEL_ACTION_CONTINUATION_METADATA_KEY = "cancelActionContinuation";

type StoredAction = {
    readonly sourceTokenId: string;
    readonly actionType: ActionType;
    readonly choice: Readonly<Record<string, unknown>>;
    readonly actionMetadata: Readonly<Record<string, unknown>>;
    readonly mechanicInstanceId: string;
    readonly mechanicTag: string;
    readonly parentOperationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function affectedTokenId(mechanic: Readonly<MechanicInstance>): string {
    return typeof mechanic.metadata.targetId === "string"
        ? mechanic.metadata.targetId
        : mechanic.sourceTokenId;
}

function availableCharges(mechanic: Readonly<MechanicInstance>): number {
    const charges = mechanic.metadata.charges;
    return typeof charges === "number" && Number.isFinite(charges) && charges > 0
        ? Math.floor(charges)
        : 0;
}

function isActionReplay(
    data: Readonly<ActionData>,
    mechanicId: string,
): boolean {
    const continuation = data.metadata?.[CANCEL_ACTION_CONTINUATION_METADATA_KEY];
    return isRecord(continuation) && continuation.mechanicInstanceId === mechanicId;
}

function readStoredAction(context: Readonly<Record<string, unknown>>): StoredAction {
    const action = context.action;
    if (!isRecord(action) ||
        typeof action.sourceTokenId !== "string" ||
        typeof action.actionType !== "string" ||
        !Object.values(ActionType).includes(action.actionType as ActionType) ||
        !isRecord(action.choice) ||
        !isRecord(action.actionMetadata) ||
        typeof action.mechanicInstanceId !== "string" ||
        typeof action.mechanicTag !== "string" ||
        (action.parentOperationId !== undefined &&
            typeof action.parentOperationId !== "string")
    ) {
        throw new Error("O contexto da ação pendente de cancelamento está incompleto.");
    }

    return {
        sourceTokenId: action.sourceTokenId,
        actionType: action.actionType as ActionType,
        choice: action.choice,
        actionMetadata: action.actionMetadata,
        mechanicInstanceId: action.mechanicInstanceId,
        mechanicTag: action.mechanicTag,
        parentOperationId: action.parentOperationId,
    };
}

function findMechanic(
    activeMechanics: unknown,
    mechanicId: string,
): MechanicInstance | null {
    if (!Array.isArray(activeMechanics)) return null;
    return (activeMechanics as MechanicInstance[]).find(
        (mechanic) => mechanic.id === mechanicId,
    ) ?? null;
}

async function resumeAction(
    handlerContext: SpecialResponseHandlerContext,
    stored: StoredAction,
): Promise<void> {
    const [{ MechanicEngine }, { BattleEngineNextTurnService }] = await Promise.all([
        import("../MechanicEngine"),
        import("../../services/micro-services/BattleEngineNextTurnService"),
    ]);

    const action = await MechanicEngine.operators.execute(
        OperatorType.ACTION_DISPATCH,
        {
            battleId: handlerContext.pending.battleId,
            sourceTokenId: stored.sourceTokenId,
            actionType: stored.actionType,
            choice: stored.choice,
            parentOperationId: stored.parentOperationId,
            cause: "SPECIAL_RESPONSE_CONTINUATION",
            metadata: {
                ...stored.actionMetadata,
                [SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY]: {
                    requestId: handlerContext.pending.requestId,
                },
                [CANCEL_ACTION_CONTINUATION_METADATA_KEY]: {
                    requestId: handlerContext.pending.requestId,
                    mechanicInstanceId: stored.mechanicInstanceId,
                },
            },
        } as ActionDispatchInput,
    );

    if (action.shouldAdvanceTurn) {
        await new BattleEngineNextTurnService().execute(
            handlerContext.pending.battleId,
            handlerContext.pending.requestId,
        );
    }
}

async function resolveActionCancellationAndApplyMechanic(
    handlerContext: SpecialResponseHandlerContext,
): Promise<void> {
    const stored = readStoredAction(handlerContext.pending.context);
    const [{ BattleStateRepository }, { MechanicEngine }, { BattleSetter }] = await Promise.all([
        import("@/modules/battles/repositories/BattleStateRepository"),
        import("../MechanicEngine"),
        import("../../context/BattleSetter"),
    ]);
    const battle = await new BattleStateRepository().findById(
        handlerContext.pending.battleId,
    );
    const mechanic = findMechanic(battle?.activeMechanics, stored.mechanicInstanceId);
    const canCancel = Boolean(
        battle?.status === "In Battle" &&
        mechanic &&
        mechanic.sourceTokenId === handlerContext.pending.responderTokenId &&
        affectedTokenId(mechanic) === stored.sourceTokenId &&
        availableCharges(mechanic) > 0,
    );

    // "Cancelar" abandona a tentativa. A ação original volta pelo operador
    // para preservar reações, custos, histórico e avanço de turno.
    if (handlerContext.resolution.action === "cancel" || !canCancel || !mechanic) {
        await resumeAction(handlerContext, stored);
        return;
    }

    // "Confirmar" realmente cancela a ação. A marca é aplicada pelo dono da
    // mecânica ao token que tentou agir e uma carga é consumida neste momento.
    await MechanicEngine.operators.execute(OperatorType.MECHANIC_APPLICATION, {
        battleId: handlerContext.pending.battleId,
        sourceTokenId: mechanic.sourceTokenId,
        tag: stored.mechanicTag,
        parentOperationId: stored.parentOperationId,
        cause: "CANCELLED_ACTION_EFFECT",
        mechanicMetadata: { targetId: stored.sourceTokenId },
    });

    await new BattleSetter().updateMechanicInstance(
        handlerContext.pending.battleId,
        mechanic.id,
        (current) => {
            if (availableCharges(current) <= 0) {
                throw new Error("As cargas para cancelar a ação já foram consumidas.");
            }
            return {
                ...current,
                metadata: {
                    ...current.metadata,
                    charges: availableCharges(current) - 1,
                },
            };
        },
    );
}

/** Re-registra o handler quando uma resposta pendente sobrevive a um restart. */
export function ensureCancelActionFormularyHandlerRegistered(): void {
    if (SpecialResponseHandlerRegistry.has(CANCEL_ACTION_FORMULARY_HANDLER_KEY)) {
        return;
    }
    SpecialResponseHandlerRegistry.register(
        CANCEL_ACTION_FORMULARY_HANDLER_KEY,
        resolveActionCancellationAndApplyMechanic,
    );
}

export class CancelActionAndApplyMechanicInterceptor extends Interceptor<ActionData> {
    readonly type = InterceptorType.ACTION_DISPATCH;

    constructor(
        private readonly mechanicTag: string,
        private readonly specialResponses = new SpecialResponseRequestService(),
    ) {
        super();
    }

    async intercept(
        data: Readonly<ActionData>,
        mechanic: Readonly<MechanicInstance>,
    ): Promise<ActionData> {
        if (
            isActionReplay(data, mechanic.id) ||
            data.sourceTokenId !== affectedTokenId(mechanic) ||
            availableCharges(mechanic) <= 0
        ) {
            return { ...data };
        }
        if (!this.mechanicTag) {
            throw new Error("A mecânica de cancelamento exige uma tag para aplicar.");
        }

        ensureCancelActionFormularyHandlerRegistered();
        await this.specialResponses.execute({
            battleId: data.battleId,
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: data.sourceTokenId,
            title: "Cancelar ação",
            description:
                "Confirme para negar esta ação e aplicar o efeito configurado ao alvo.",
            fields: [],
            handlerKey: CANCEL_ACTION_FORMULARY_HANDLER_KEY,
            context: {
                action: {
                    sourceTokenId: data.sourceTokenId,
                    choice: data.choice,
                    actionType: data.actionType,
                    actionMetadata: data.metadata ?? {},
                    parentOperationId: data.parentOperationId,
                    mechanicInstanceId: mechanic.id,
                    mechanicTag: this.mechanicTag,
                },
            },
        });

        return { ...data, cancelled: true };
    }
}
