import type { RollData } from "../../operators/RollOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

export const PROFICIENCY_ROLL_PENALTY_METADATA_KEY = "proficiencyRollPenalty";

interface ProficiencyRollPenalty {
    readonly mechanicInstanceId: string;
    readonly affectedTokenId: string;
    readonly amount: number;
}

function readPenalty(value: unknown): ProficiencyRollPenalty | null {
    if (!value || typeof value !== "object") return null;
    const penalty = value as Record<string, unknown>;
    if (
        typeof penalty.mechanicInstanceId !== "string" ||
        typeof penalty.affectedTokenId !== "string" ||
        typeof penalty.amount !== "number" ||
        !Number.isFinite(penalty.amount) ||
        penalty.amount <= 0
    ) return null;

    return {
        mechanicInstanceId: penalty.mechanicInstanceId,
        affectedTokenId: penalty.affectedTokenId,
        amount: penalty.amount,
    };
}

/** Subtracts a one-operation proficiency penalty selected by a special response. */
export class ProficiencyRollPenaltyInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): RollData {
        const penalty = readPenalty(
            data.metadata?.[PROFICIENCY_ROLL_PENALTY_METADATA_KEY],
        );
        if (
            !penalty ||
            penalty.mechanicInstanceId !== mechanic.id ||
            penalty.affectedTokenId !== data.params.tokenId
        ) return { ...data };

        const modifierKey = `proficiency-penalty:${mechanic.id}:${data.operationId}`;
        if (data.appliedRollPenaltyKeys?.includes(modifierKey)) return { ...data };

        return {
            ...data,
            params: {
                ...data.params,
                PF: data.params.PF - penalty.amount,
            },
            appliedRollPenaltyKeys: [
                ...(data.appliedRollPenaltyKeys ?? []),
                modifierKey,
            ],
        };
    }
}
