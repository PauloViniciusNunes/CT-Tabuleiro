import type { OperationIntent, OperationContext } from "./OperationContext";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { Operator, type OperatorRuntime } from "./Operator";
import { BattleSetter } from "../context/BattleSetter";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { ManaIncrementEvent } from "../mechanic/events/ManaIncrementEvent";

export interface ManaIncrementIntent extends OperationIntent {
    readonly sourceTokenId: string
    readonly amount: number
}

export interface ManaIncrementData extends ManaIncrementIntent, OperationContext, InterceptableData { }

export type ManaIncrementInput = ManaIncrementIntent & {
    readonly operationId?: string;
}

export class ManaIncrementOperator extends Operator<ManaIncrementInput, ManaIncrementData> {

    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime)
    }

    async execute(input: ManaIncrementInput): Promise<ManaIncrementData> {

        if (!input.battleId || !input.sourceTokenId) {
            throw new Error("A incrementação de mana precisa de batalha e token de origem.");
        }

        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de mana precisa ser um número não negativo.");
        }

        const increment = await this.runtime.intercept(InterceptorType.MANA_INCREMENT, {
            ...input,
            operationId: input.operationId ?? crypto.randomUUID(),
            amount: Math.floor(input.amount),
            cancelled: false,            
        }, input.battleId)

        if(increment.cancelled || increment.amount <= 0) {
            return increment
        }

        await this.battleSetter.tokenAddMana(
            increment.sourceTokenId,
            increment.amount
        )

        await this.runtime.dispatchEvent(
            increment.battleId,
            new ManaIncrementEvent(increment),
            { mana: increment },
        )

        return increment
    }

}
