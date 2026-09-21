import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { TokenResourcesSetEvent } from "../mechanic/events/TokenResourcesSetEvent";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface TokenResourceIntent extends OperationIntent {
    readonly targetTokenId: string;
    readonly currentLife?: number;
    readonly currentMana?: number;
}

export interface TokenResourceData
    extends TokenResourceIntent, OperationContext, InterceptableData {
    readonly previousLife: number;
    readonly previousMana: number;
    readonly nextLife: number;
    readonly nextMana: number;
}

export type TokenResourceInput = TokenResourceIntent & {
    readonly operationId?: string;
};

/** Official boundary for absolute HP/MP changes such as resource equalization. */
export class TokenResourceOperator extends Operator<TokenResourceInput, TokenResourceData> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
    ) {
        super(runtime);
    }

    async execute(input: TokenResourceInput): Promise<TokenResourceData> {
        if (!input.battleId || !input.targetTokenId) {
            throw new Error("A definição de recursos precisa de batalha e token alvo.");
        }

        if (input.currentLife === undefined && input.currentMana === undefined) {
            throw new Error("Ao menos um recurso precisa ser informado.");
        }

        const [battle, token] = await Promise.all([
            this.battleRepository.findById(input.battleId),
            this.tokenRepository.findTokenTemplateById(input.targetTokenId),
        ]);

        if (!battle || !token || token.mapId !== battle.mapId) {
            throw new Error("O token alvo precisa pertencer ao mapa da batalha.");
        }

        const requestedLife = input.currentLife ?? token.currentLife;
        const requestedMana = input.currentMana ?? token.currentMana;
        if (!Number.isFinite(requestedLife) || !Number.isFinite(requestedMana)) {
            throw new Error("Vida e mana precisam ser números finitos.");
        }

        const resources = await this.runtime.intercept(
            InterceptorType.RESOURCE_SET,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                previousLife: token.currentLife,
                previousMana: token.currentMana,
                nextLife: Math.max(0, Math.min(token.maxLife, requestedLife)),
                nextMana: Math.max(0, Math.min(token.maxMana, requestedMana)),
                cancelled: false,
            },
            input.battleId,
        );

        if (resources.cancelled) return resources;

        await this.tokenRepository.update(resources.targetTokenId, {
            currentLife: resources.nextLife,
            currentMana: resources.nextMana,
        });

        await this.runtime.dispatchEvent(
            resources.battleId,
            new TokenResourcesSetEvent(resources),
            { resources },
        );

        return resources;
    }
}
