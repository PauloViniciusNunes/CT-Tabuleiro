import type { RollData } from "../../operators/RollOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

/** Metadata written by a confirmed response before an intercepted action resumes. */
export const ROLL_QUANTITY_BONUS_METADATA_KEY = "rollQuantityBonus";

interface RollQuantityBonus {
    readonly mechanicInstanceId: string;
    readonly sourceTokenId: string;
    readonly amount: number;
}

function readRollQuantityBonus(value: unknown): RollQuantityBonus | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const bonus = value as Record<string, unknown>;
    if (
        typeof bonus.mechanicInstanceId !== "string" ||
        typeof bonus.sourceTokenId !== "string" ||
        typeof bonus.amount !== "number" ||
        !Number.isInteger(bonus.amount) ||
        bonus.amount <= 0
    ) {
        return null;
    }

    return {
        mechanicInstanceId: bonus.mechanicInstanceId,
        sourceTokenId: bonus.sourceTokenId,
        amount: bonus.amount,
    };
}

/**
 * Adds a one-operation configured quantity bonus to a roll.
 *
 * The bonus is explicitly carried by the operation metadata, which keeps this
 * interceptor reusable for any mechanic that needs to increase Q after a
 * validated decision. It intentionally does not cap Q: the action formula is
 * allowed to represent attacks composed of more than five actions.
 */
export class RollQuantityBonusInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    intercept(
        data: Readonly<RollData>,
        mechanic: Readonly<MechanicInstance>,
    ): RollData {
        const bonus = readRollQuantityBonus(
            data.metadata?.[ROLL_QUANTITY_BONUS_METADATA_KEY],
        );
        if (
            !bonus ||
            bonus.mechanicInstanceId !== mechanic.id ||
            bonus.sourceTokenId !== mechanic.sourceTokenId ||
            data.params.tokenId !== mechanic.sourceTokenId ||
            data.metadata?.attackType !== "fisico" ||
            typeof data.metadata?.targetTokenId !== "string" ||
            !data.metadata.targetTokenId
        ) {
            return { ...data };
        }

        const modifierKey = `roll-quantity-bonus:${mechanic.id}:${data.operationId}`;
        if (data.appliedRollQuantityBonusKeys?.includes(modifierKey)) {
            return { ...data };
        }

        return {
            ...data,
            params: {
                ...data.params,
                Q: data.params.Q + bonus.amount,
            },
            appliedRollQuantityBonusKeys: [
                ...(data.appliedRollQuantityBonusKeys ?? []),
                modifierKey,
            ],
        };
    }
}
