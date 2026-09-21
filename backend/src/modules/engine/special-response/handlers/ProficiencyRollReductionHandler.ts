import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { ActionType } from "../../context/ActionType";
import type { MechanicInstance } from "../../mechanic/mechanics/MechanicInstance";
import { PROFICIENCY_ROLL_PENALTY_METADATA_KEY } from "../../mechanic/interceptors/ProficiencyRollPenaltyInterceptor";
import { OperatorType } from "../../operators/OperatorType";
import { SpecialResponseHandlerRegistry } from "../SpecialResponseHandlerRegistry";
import {
    SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY,
    type SpecialResponseHandlerContext,
} from "../types";

export const PROFICIENCY_ROLL_REDUCTION_HANDLER_KEY =
    "roll.proficiency-reduction.v1";

interface StoredActionContext {
    readonly actionType: ActionType;
    readonly sourceTokenId: string;
    readonly targetTokenId: string;
    readonly mechanicInstanceId: string;
    readonly choice: Readonly<Record<string, unknown>>;
    readonly actionMetadata: Readonly<Record<string, unknown>>;
    readonly parentOperationId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readStoredAction(value: Readonly<Record<string, unknown>>): StoredActionContext {
    const actionType = value.actionType;
    const sourceTokenId = value.sourceTokenId;
    const targetTokenId = value.targetTokenId;
    const mechanicInstanceId = value.mechanicInstanceId;
    const choice = value.choice;
    const actionMetadata = value.actionMetadata;
    const parentOperationId = value.parentOperationId;

    if (
        typeof actionType !== "string" ||
        !Object.values(ActionType).includes(actionType as ActionType) ||
        typeof sourceTokenId !== "string" ||
        typeof targetTokenId !== "string" ||
        typeof mechanicInstanceId !== "string" ||
        !isRecord(choice) ||
        !isRecord(actionMetadata) ||
        (parentOperationId !== undefined && typeof parentOperationId !== "string")
    ) {
        throw new Error("O contexto da redução de rolagem está incompleto.");
    }

    return {
        actionType: actionType as ActionType,
        sourceTokenId,
        targetTokenId,
        mechanicInstanceId,
        choice,
        actionMetadata,
        parentOperationId,
    };
}

export function findMechanic(
    activeMechanics: unknown,
    mechanicInstanceId: string,
): MechanicInstance | null {
    if (!Array.isArray(activeMechanics)) return null;
    return (activeMechanics as MechanicInstance[]).find(
        (mechanic) => mechanic.id === mechanicInstanceId,
    ) ?? null;
}

export async function resumeAction(
    handlerContext: SpecialResponseHandlerContext,
    stored: StoredActionContext,
    penalty: number,
): Promise<void> {
    // Dynamic imports avoid coupling the durable handler registry to the
    // MechanicEngine bootstrap graph.
    const [{ MechanicEngine }, { BattleEngineNextTurnService }] = await Promise.all([
        import("../../mechanic/MechanicEngine"),
        import("../../services/micro-services/BattleEngineNextTurnService"),
    ]);

    const metadata: Record<string, unknown> = {
        ...stored.actionMetadata,
        [SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY]: {
            requestId: handlerContext.pending.requestId,
            mechanicInstanceId: stored.mechanicInstanceId,
        },
    };
    if (penalty > 0) {
        metadata[PROFICIENCY_ROLL_PENALTY_METADATA_KEY] = {
            mechanicInstanceId: stored.mechanicInstanceId,
            affectedTokenId: stored.sourceTokenId,
            amount: penalty,
        };
    }

    const action = await MechanicEngine.operators.execute(
        OperatorType.ACTION_DISPATCH,
        {
            battleId: handlerContext.pending.battleId,
            sourceTokenId: stored.sourceTokenId,
            actionType: stored.actionType,
            choice: stored.choice,
            parentOperationId: stored.parentOperationId,
            cause: "SPECIAL_RESPONSE_CONTINUATION",
            metadata,
        },
    );

    if (action.shouldAdvanceTurn) {
        await new BattleEngineNextTurnService().execute(
            handlerContext.pending.battleId,
            handlerContext.pending.requestId,
        );
    }
}

async function handleProficiencyRollReduction(
    handlerContext: SpecialResponseHandlerContext,
): Promise<void> {
    const stored = readStoredAction(handlerContext.pending.context);
    const [battle, responder] = await Promise.all([
        new BattleStateRepository().findById(handlerContext.pending.battleId),
        new TokenTemplateRepository().findTokenTemplateById(
            handlerContext.pending.responderTokenId,
        ),
    ]);
    if (!battle || battle.status !== "In Battle") {
        throw new Error("A batalha terminou antes da resposta de Super Percepção.");
    }

    const mechanic = findMechanic(battle.activeMechanics, stored.mechanicInstanceId);
    const canApply = Boolean(
        responder &&
        responder.mapId === battle.mapId &&
        mechanic &&
        mechanic.sourceTokenId === responder?.id &&
        responder.id === stored.targetTokenId,
    );

    // Cancelar o formulário, ou perder a mecânica enquanto ele estava aberto,
    // libera o ataque original sem custo e sem modificação.
    if (handlerContext.resolution.action === "cancel" || !canApply || !responder) {
        await resumeAction(handlerContext, stored, 0);
        return;
    }

    const requestedMana = handlerContext.resolution.values.spentMana;
    if (
        typeof requestedMana !== "number" ||
        !Number.isInteger(requestedMana) ||
        requestedMana < 1 ||
        requestedMana > responder.currentMana
    ) {
        throw new Error("A quantidade de mana escolhida não está mais disponível.");
    }

    const { MechanicEngine } = await import("../../mechanic/MechanicEngine");
    const manaDecrease = await MechanicEngine.operators.execute(
        OperatorType.MANA_DECREASE,
        {
            battleId: handlerContext.pending.battleId,
            sourceTokenId: responder.id,
            amount: requestedMana,
            cause: "PROFICIENCY_ROLL_REDUCTION",
        },
    );
    const spentMana = manaDecrease.cancelled ? 0 : manaDecrease.amount;
    const proficiency = Math.ceil((responder.level - 10) / 4 + 4);

    await resumeAction(handlerContext, stored, proficiency * spentMana);
}

export function ensureProficiencyRollReductionHandlerRegistered(): void {
    if (SpecialResponseHandlerRegistry.has(PROFICIENCY_ROLL_REDUCTION_HANDLER_KEY)) {
        return;
    }
    SpecialResponseHandlerRegistry.register(
        PROFICIENCY_ROLL_REDUCTION_HANDLER_KEY,
        handleProficiencyRollReduction,
    );
}
