import type { OperationIntent, OperationContext } from "./OperationContext";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { Operator, type OperatorRuntime } from "./Operator";
import { BattleSetter } from "../context/BattleSetter";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { ManaDecreaseEvent } from "../mechanic/events/ManaDecreaseEvent";

export interface ManaDecreaseIntent extends OperationIntent {
    readonly sourceTokenId: string
    readonly amount: number
}

export interface ManaDecreaseData extends ManaDecreaseIntent, OperationContext, InterceptableData { }

export type ManaDecreaseInput = ManaDecreaseIntent & {
    readonly operationId?: string;
}

export class ManaDecreaseOperator extends Operator<ManaDecreaseInput, ManaDecreaseData> {

    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime)
    }

    async execute(input: ManaDecreaseInput): Promise<ManaDecreaseData> {

        if (!input.battleId || !input.sourceTokenId) {
            throw new Error("A redução de mana precisa de batalha e token de origem.");
        }

        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de mana precisa ser um número não negativo.");
        }

        const decrease = await this.runtime.intercept(InterceptorType.MANA_DECREASE, {
            ...input,
            operationId: input.operationId ?? crypto.randomUUID(),
            amount: Math.floor(input.amount),
            cancelled: false,            
        }, input.battleId)

        if(decrease.cancelled || decrease.amount <= 0) {
            return decrease
        }

        await this.battleSetter.tokenDecreaseMana(
            decrease.sourceTokenId,
            decrease.amount
        )

        await this.runtime.dispatchEvent(
            decrease.battleId,
            new ManaDecreaseEvent(decrease),
            { mana: decrease },
        )

        return decrease
    }

}
