import { BattleSetter } from "../context/BattleSetter";
import { LifeDecreaseEvent } from "../mechanic/events/LifeDecreaseEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface LifeDecreaseIntent extends OperationIntent {
    readonly sourceTokenId?: string;
    readonly targetTokenId: string;
    readonly amount: number;
}

export interface LifeDecreaseData
    extends LifeDecreaseIntent, OperationContext, InterceptableData {}

export type LifeDecreaseInput = LifeDecreaseIntent & {
    readonly operationId?: string;
};

/**
 * Official boundary for life costs and losses that are not damage.
 * Damage must continue to use DamageOperator so its own rules still apply.
 */
export class LifeDecreaseOperator extends Operator<
    LifeDecreaseInput,
    LifeDecreaseData
> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime);
    }

    async execute(input: LifeDecreaseInput): Promise<LifeDecreaseData> {
        if (!input.battleId || !input.targetTokenId) {
            throw new Error("A redução de vida precisa de batalha e token alvo.");
        }
        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de vida precisa ser um número não negativo.");
        }

        const decrease = await this.runtime.intercept(
            InterceptorType.LIFE_DECREASE,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                amount: Math.floor(input.amount),
                cancelled: false,
            },
            input.battleId,
        );

        if (decrease.cancelled || decrease.amount <= 0) return decrease;

        await this.battleSetter.tokenDecreaseLife(
            decrease.targetTokenId,
            decrease.amount,
        );
        await this.runtime.dispatchEvent(
            decrease.battleId,
            new LifeDecreaseEvent(decrease),
            { life: decrease },
        );

        return decrease;
    }
}
