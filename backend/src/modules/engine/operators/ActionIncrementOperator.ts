import { BattleSetter } from "../context/BattleSetter";
import { ActionIncrementEvent } from "../mechanic/events/ActionIncrementEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface ActionIncrementIntent extends OperationIntent {
    readonly sourceTokenId?: string;
    readonly targetTokenId: string;
    readonly amount: number;
}

export interface ActionIncrementData
    extends ActionIncrementIntent, OperationContext, InterceptableData {}

export type ActionIncrementInput = ActionIncrementIntent & {
    readonly operationId?: string;
};

/** Official boundary for granting accumulated battle actions, capped at five. */
export class ActionIncrementOperator extends Operator<
    ActionIncrementInput,
    ActionIncrementData
> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime);
    }

    async execute(input: ActionIncrementInput): Promise<ActionIncrementData> {
        if (!input.battleId || !input.targetTokenId) {
            throw new Error("A concessão de ações precisa de batalha e token alvo.");
        }
        if (!Number.isInteger(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de ações precisa ser um número inteiro não negativo.");
        }

        const increment = await this.runtime.intercept(
            InterceptorType.ACTION_INCREMENT,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                amount: input.amount,
                cancelled: false,
            },
            input.battleId,
        );

        if (increment.cancelled || increment.amount <= 0) return increment;

        await this.battleSetter.tokenAddAction(
            increment.battleId,
            increment.targetTokenId,
            increment.amount,
        );
        await this.runtime.dispatchEvent(
            increment.battleId,
            new ActionIncrementEvent(increment),
            { action: increment },
        );

        return increment;
    }
}
