import { BattleSetter } from "../context/BattleSetter";
import { LifeIncrementEvent } from "../mechanic/events/LifeIncrementEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface LifeIncrementIntent extends OperationIntent {
    readonly sourceTokenId?: string;
    readonly targetTokenId: string;
    readonly amount: number;
}

export interface LifeIncrementData
    extends LifeIncrementIntent, OperationContext, InterceptableData {}

export type LifeIncrementInput = LifeIncrementIntent & {
    readonly operationId?: string;
};

/** Official boundary for relative life recovery that is not an absolute set. */
export class LifeIncrementOperator extends Operator<
    LifeIncrementInput,
    LifeIncrementData
> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime);
    }

    async execute(input: LifeIncrementInput): Promise<LifeIncrementData> {
        if (!input.battleId || !input.targetTokenId) {
            throw new Error("A recuperação de vida precisa de batalha e token alvo.");
        }
        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de vida precisa ser um número não negativo.");
        }

        const increment = await this.runtime.intercept(
            InterceptorType.LIFE_INCREMENT,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                amount: Math.floor(input.amount),
                cancelled: false,
            },
            input.battleId,
        );

        if (increment.cancelled || increment.amount <= 0) return increment;

        await this.battleSetter.tokenAddLife(
            increment.targetTokenId,
            increment.amount,
        );
        await this.runtime.dispatchEvent(
            increment.battleId,
            new LifeIncrementEvent(increment),
            { life: increment },
        );

        return increment;
    }
}
