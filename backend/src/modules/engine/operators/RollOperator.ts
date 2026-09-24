import {
    calculateActionRoll,
    type ActionRollParams,
    type RollResult,
} from "../utils/calculations";
import { RollResolvedEvent } from "../mechanic/events/RollResolvedEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface RollIntent extends OperationIntent {
    /** Components of the formula, before any interceptor changes them. */
    readonly params: Omit<ActionRollParams, "CRI">;
}

export interface RollData extends OperationContext, InterceptableData {
    readonly params: Omit<ActionRollParams, "CRI">;
    /** The item selected for this roll, if any. Kept at the top level for interceptors. */
    readonly usedItemId: string | undefined;
    readonly result?: RollResult;
    readonly appliedRollBonusKeys?: readonly string[];
    readonly appliedRollPenaltyKeys?: readonly string[];
    readonly appliedRollQuantityBonusKeys?: readonly string[];
}

export type RollInput = RollIntent & {
    readonly operationId?: string;
};

function assertRollParams(params: Omit<ActionRollParams, "CRI">): void {
    const numericParams = [
        params.Q,
        params.P,
        params.A,
        params.PF,
        params.O,
        params.N,
        params.L,
        params.M,
    ];

    if (numericParams.some((value) => !Number.isFinite(value))) {
        throw new Error("Os componentes da rolagem precisam ser números finitos.");
    }

    if (!Number.isInteger(params.Q) || params.Q < 1) {
        throw new Error("A quantidade de dados da rolagem precisa ser um inteiro positivo.");
    }

    if (
        params.usedItemId !== undefined &&
        (typeof params.usedItemId !== "string" || !params.usedItemId.trim())
    ) {
        throw new Error("O ID do item usado na rolagem é inválido.");
    }
}

/** Resolves action rolls through the same interception boundary. */
export class RollOperator extends Operator<RollInput, RollData> {
    constructor(runtime: OperatorRuntime) {
        super(runtime);
    }

    async execute(input: RollInput): Promise<RollData> {
        if (!input.battleId || !input.params?.tokenId) {
            throw new Error("A intenção de rolagem precisa de batalha e token.");
        }

        assertRollParams(input.params);

        const interceptedRoll = await this.runtime.intercept(InterceptorType.ROLL, {
            ...input,
            operationId: input.operationId ?? crypto.randomUUID(),
            // Interceptors must replace parameters instead of mutating the caller's object.
            params: Object.freeze({ ...input.params }),
            usedItemId: input.params.usedItemId,
            cancelled: false,
        }, input.battleId);
        const roll: RollData = {
            ...interceptedRoll,
            usedItemId: interceptedRoll.params.usedItemId,
        };

        if (roll.cancelled) {
            return roll;
        }

        assertRollParams(roll.params);
        const resolved: RollData = {
            ...roll,
            result: calculateActionRoll(roll.params),
        };

        await this.runtime.dispatchEvent(
            resolved.battleId,
            new RollResolvedEvent(resolved),
            { roll: resolved },
        );

        return resolved;
    }
}
