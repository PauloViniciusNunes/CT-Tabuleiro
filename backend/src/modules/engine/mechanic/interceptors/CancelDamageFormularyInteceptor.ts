import { BattleSetter } from "../../context/BattleSetter";
import type { DamageData } from "../../operators/DamageOperator";
import { SpecialResponseHandlerRegistry } from "../../special-response/SpecialResponseHandlerRegistry";
import { SpecialResponseRequestService } from "../../special-response/SpecialResponseRequestService";
import type { SpecialResponseHandlerContext } from "../../special-response/types";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

export const CANCEL_DAMAGE_FORMULARY_HANDLER_KEY = "damage.cancel.formulary.v1";
export const CANCEL_DAMAGE_CONTINUATION_METADATA_KEY = "damageCancelContinuation";

type StoredDamage = {
    readonly sourceTokenId?: string;
    readonly targetTokenId: string;
    readonly amount: number;
    readonly element?: string;
    readonly cause?: string;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly parentOperationId?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function protectedTokenId(mechanic: Readonly<MechanicInstance>): string {
    return typeof mechanic.metadata.targetId === "string"
        ? mechanic.metadata.targetId
        : mechanic.sourceTokenId;
}

function availableCharges(mechanic: Readonly<MechanicInstance>): number {
    const rawCharges = mechanic.metadata.cancelDamageCharges;
    return typeof rawCharges === "number" &&
        Number.isFinite(rawCharges) &&
        rawCharges > 0
        ? Math.floor(rawCharges)
        : 0;
}

function isDamageReplay(data: Readonly<DamageData>): boolean {
    return isRecord(data.metadata?.[CANCEL_DAMAGE_CONTINUATION_METADATA_KEY]);
}

function readStoredDamage(
    context: Readonly<Record<string, unknown>>,
): StoredDamage {
    const damage = context.damage;
    if (!isRecord(damage) ||
        typeof damage.targetTokenId !== "string" ||
        typeof damage.amount !== "number" ||
        !Number.isFinite(damage.amount)
    ) {
        throw new Error("O dano pendente de cancelamento está incompleto.");
    }

    if (damage.sourceTokenId !== undefined && typeof damage.sourceTokenId !== "string") {
        throw new Error("A origem do dano pendente é inválida.");
    }
    if (damage.element !== undefined && typeof damage.element !== "string") {
        throw new Error("O elemento do dano pendente é inválido.");
    }
    if (damage.cause !== undefined && typeof damage.cause !== "string") {
        throw new Error("A causa do dano pendente é inválida.");
    }
    if (
        damage.parentOperationId !== undefined &&
        typeof damage.parentOperationId !== "string"
    ) {
        throw new Error("A operação de origem do dano pendente é inválida.");
    }

    return {
        sourceTokenId: damage.sourceTokenId,
        targetTokenId: damage.targetTokenId,
        amount: Math.floor(damage.amount),
        element: damage.element,
        cause: damage.cause,
        metadata: isRecord(damage.metadata) ? damage.metadata : {},
        parentOperationId: damage.parentOperationId,
    };
}

async function resolveDamageCancellation(
    handlerContext: SpecialResponseHandlerContext,
): Promise<void> {
    // Submit confirms the cancellation. The form's Cancel button lets the
    // original damage continue through the normal DamageOperator boundary.
    if (handlerContext.resolution.action !== "cancel") return;

    const damage = readStoredDamage(handlerContext.pending.context);
    const [{ MechanicEngine }, { OperatorType }] = await Promise.all([
        import("../MechanicEngine"),
        import("../../operators/OperatorType"),
    ]);

    await MechanicEngine.operators.execute(OperatorType.DAMAGE, {
        battleId: handlerContext.pending.battleId,
        sourceTokenId: damage.sourceTokenId,
        targetTokenId: damage.targetTokenId,
        amount: damage.amount,
        element: damage.element,
        cause: damage.cause ?? "DAMAGE_CANCEL_DECLINED",
        parentOperationId: damage.parentOperationId,
        metadata: {
            ...damage.metadata,
            [CANCEL_DAMAGE_CONTINUATION_METADATA_KEY]: {
                requestId: handlerContext.pending.requestId,
            },
        },
    });
}

/** Re-registers the durable handler after a server restart. */
export function ensureCancelDamageFormularyHandlerRegistered(): void {
    if (SpecialResponseHandlerRegistry.has(CANCEL_DAMAGE_FORMULARY_HANDLER_KEY)) {
        return;
    }

    SpecialResponseHandlerRegistry.register(
        CANCEL_DAMAGE_FORMULARY_HANDLER_KEY,
        resolveDamageCancellation,
    );
}

/**
 * Cancels damage for its protected target, spends one charge and opens a
 * confirmation form. Damage is replayed only when the player declines it.
 */
export class CancelDamageFormularyInteceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;

    constructor(
        private readonly battleSetter = new BattleSetter(),
        private readonly specialResponses = new SpecialResponseRequestService(),
    ) {
        super();
    }

    async intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): Promise<DamageData> {
        if (
            isDamageReplay(data) ||
            data.amount <= 0 ||
            data.targetTokenId !== protectedTokenId(mechanic) ||
            availableCharges(mechanic) <= 0
        ) {
            return { ...data };
        }

        ensureCancelDamageFormularyHandlerRegistered();
        await this.specialResponses.execute({
            battleId: data.battleId,
            responderTokenId: protectedTokenId(mechanic),
            requestedByTokenId: data.sourceTokenId,
            title: "Cancelar dano",
            description:
                "Confirme para negar este dano. Cancele o formulário para permitir que ele seja aplicado.",
            fields: [],
            handlerKey: CANCEL_DAMAGE_FORMULARY_HANDLER_KEY,
            context: {
                mechanicInstanceId: mechanic.id,
                damage: {
                    sourceTokenId: data.sourceTokenId,
                    targetTokenId: data.targetTokenId,
                    amount: data.amount,
                    element: data.element,
                    cause: data.cause,
                    metadata: data.metadata ?? {},
                    parentOperationId: data.parentOperationId,
                },
            },
        });

        await this.battleSetter.updateMechanicInstance(
            data.battleId,
            mechanic.id,
            (current) => ({
                ...current,
                metadata: {
                    ...current.metadata,
                    cancelDamageCharges: Math.max(0, availableCharges(current) - 1),
                },
            }),
        );

        return { ...data, cancelled: true };
    }
}
