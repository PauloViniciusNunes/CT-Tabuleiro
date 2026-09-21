import { BattleSetter } from "../context/BattleSetter";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { DamageReceivedEvent } from "../mechanic/events/DamageReceivedEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";
import {
    createTokenElementProfile,
    type TokenElementProfile,
} from "../utils/elementalAffinity";

export interface DamageIntent extends OperationIntent {
    readonly sourceTokenId?: string;
    readonly targetTokenId: string;
    readonly amount: number;
    readonly element?: string;
}

export interface DamageData extends DamageIntent, OperationContext, InterceptableData {
    /** Requested amount before reusable damage modifiers are applied. */
    readonly baseAmount: number;
    readonly sourceToken?: TokenElementProfile;
    readonly targetToken: TokenElementProfile;
    /** Elements whose specific immunity may be ignored by this operation. */
    readonly ignoredImmunityElements?: readonly string[];
    /** Prevents the same reusable modifier from stacking accidentally. */
    readonly appliedDamageModifierKeys?: readonly string[];
}

export type DamageInput = DamageIntent & {
    readonly operationId?: string;
};

export class DamageOperator extends Operator<DamageInput, DamageData> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleSetter = new BattleSetter(),
        private readonly tokenRepository = new TokenTemplateRepository(),
    ) {
        super(runtime);
    }

    async execute(input: DamageInput): Promise<DamageData> {
        if (!input.battleId || !input.targetTokenId) {
            throw new Error("A intenção de dano precisa de batalha e alvo.");
        }

        if (!Number.isFinite(input.amount) || input.amount < 0) {
            throw new Error("A quantidade de dano precisa ser um número não negativo.");
        }

        const [sourceToken, targetToken] = await Promise.all([
            input.sourceTokenId
                ? this.tokenRepository.findTokenTemplateById(input.sourceTokenId)
                : Promise.resolve(null),
            this.tokenRepository.findTokenTemplateById(input.targetTokenId),
        ]);

        if (!targetToken) {
            throw new Error("O token alvo da intenção de dano não foi encontrado.");
        }
        
        // intercept = MechanicEngine.process
        const damage = await this.runtime.intercept(InterceptorType.DAMAGE, {
            ...input,
            operationId: input.operationId ?? crypto.randomUUID(),
            baseAmount: Math.floor(input.amount),
            amount: Math.floor(input.amount),
            sourceToken: sourceToken
                ? createTokenElementProfile(sourceToken)
                : undefined,
            targetToken: createTokenElementProfile(targetToken),
            cancelled: false,
        }, input.battleId);

        if (damage.cancelled || damage.amount === 0) {
            return damage;
        }

        const updatedTarget = await this.battleSetter.tokenDamage(
            damage.targetTokenId,
            damage.amount,
            damage.sourceTokenId ?? "",
        );

        if (!updatedTarget) {
            throw new Error("O dano não pôde ser aplicado ao token alvo.");
        }

        await this.runtime.dispatchEvent(
            damage.battleId,
            new DamageReceivedEvent(damage),
            {
                damage: damage.amount,
                sourceTokenId: damage.sourceTokenId,
                targetTokenId: damage.targetTokenId,
                element: damage.element,
                operation: damage,
            },
        );

        return damage;
    }
}
