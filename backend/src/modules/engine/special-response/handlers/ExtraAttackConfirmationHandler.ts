import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { ActionType } from "../../context/ActionType";
import type { MechanicInstance } from "../../mechanic/mechanics/MechanicInstance";
import { ROLL_QUANTITY_BONUS_METADATA_KEY } from "../../mechanic/interceptors/RollQuantityBonusInterceptor";
import { OperatorType } from "../../operators/OperatorType";
import { SpecialResponseHandlerRegistry } from "../SpecialResponseHandlerRegistry";
import {
    SPECIAL_RESPONSE_CONTINUATION_METADATA_KEY,
    type SpecialResponseHandlerContext,
} from "../types";

export const EXTRA_ATTACK_CONFIRMATION_HANDLER_KEY =
    "action.extra-attack.confirmation.v1";

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

function readStoredAction(
    value: Readonly<Record<string, unknown>>,
): StoredActionContext {
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
        throw new Error("O contexto dos ataques extras está incompleto.");
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

function findMechanic(
    activeMechanics: unknown,
    mechanicInstanceId: string,
): MechanicInstance | null {
    if (!Array.isArray(activeMechanics)) return null;

    return (activeMechanics as MechanicInstance[]).find(
        (mechanic) => mechanic.id === mechanicInstanceId,
    ) ?? null;
}

function configuredExtraAttacks(mechanic: Readonly<MechanicInstance>): number {
    const amount = mechanic.metadata.extraAttacks;
    return typeof amount === "number" &&
        Number.isInteger(amount) &&
        amount > 0
        ? amount
        : 0;
}

function canUseExtraAttacks(mechanic: Readonly<MechanicInstance>): boolean {
    return mechanic.metadata.canUsage === true;
}

async function resumeAction(
    handlerContext: SpecialResponseHandlerContext,
    stored: StoredActionContext,
    extraAttacks: number,
): Promise<void> {
    // Dynamic imports keep the durable handler registry independent from the
    // MechanicEngine module graph during application bootstrap.
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
    if (extraAttacks > 0) {
        metadata[ROLL_QUANTITY_BONUS_METADATA_KEY] = {
            mechanicInstanceId: stored.mechanicInstanceId,
            sourceTokenId: stored.sourceTokenId,
            amount: extraAttacks,
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

async function handleExtraAttackConfirmation(
    handlerContext: SpecialResponseHandlerContext,
): Promise<void> {
    const stored = readStoredAction(handlerContext.pending.context);
    const [battle, sourceToken] = await Promise.all([
        new BattleStateRepository().findById(handlerContext.pending.battleId),
        new TokenTemplateRepository().findTokenTemplateById(stored.sourceTokenId),
    ]);

    if (!battle || battle.status !== "In Battle") {
        throw new Error("A batalha terminou antes da resposta de ataques extras.");
    }

    const mechanic = findMechanic(battle.activeMechanics, stored.mechanicInstanceId);
    const canApply = Boolean(
        sourceToken &&
        sourceToken.mapId === battle.mapId &&
        mechanic &&
        mechanic.sourceTokenId === stored.sourceTokenId &&
        canUseExtraAttacks(mechanic) &&
        configuredExtraAttacks(mechanic) > 0,
    );

    // Declining, or losing the mechanic while the form is open, simply lets
    // the original action continue without a quantity modifier.
    if (handlerContext.resolution.action === "cancel" || !canApply || !mechanic) {
        await resumeAction(handlerContext, stored, 0);
        return;
    }

    const { BattleSetter } = await import("../../context/BattleSetter");
    await new BattleSetter().updateMechanicInstance(
        handlerContext.pending.battleId,
        mechanic.id,
        (current) => {
            if (!canUseExtraAttacks(current)) {
                throw new Error("Os ataques extras já foram usados neste turno.");
            }

            return {
                ...current,
                metadata: {
                    ...current.metadata,
                    canUsage: false,
                },
            };
        },
    );

    await resumeAction(
        handlerContext,
        stored,
        configuredExtraAttacks(mechanic),
    );
}

/** Re-registers the durable handler after a server restart. */
export function ensureExtraAttackConfirmationHandlerRegistered(): void {
    if (SpecialResponseHandlerRegistry.has(EXTRA_ATTACK_CONFIRMATION_HANDLER_KEY)) {
        return;
    }

    SpecialResponseHandlerRegistry.register(
        EXTRA_ATTACK_CONFIRMATION_HANDLER_KEY,
        handleExtraAttackConfirmation,
    );
}
