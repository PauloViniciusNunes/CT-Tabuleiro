import {
    EnvironmentChangedEvent,
    EnvironmentChangeDeniedEvent,
} from "../mechanic/events/EnvironmentEvents";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import {
    createTokenElementProfile,
    type TokenElementProfile,
} from "../utils/elementalAffinity";

export interface EnvironmentChange {
    /** Example: darkness, dense-fog, temperature or terrain. */
    readonly kind: string;
    readonly scope: "map" | "cell" | "area";
    readonly payload: Readonly<Record<string, unknown>>;
}

export interface EnvironmentIntent extends OperationIntent {
    readonly mapId: string;
    readonly sourceTokenId?: string;
    readonly change: EnvironmentChange;
}

export interface EnvironmentData extends OperationContext, InterceptableData {
    readonly mapId: string;
    readonly change: EnvironmentChange;
    readonly sourceToken?: TokenElementProfile;
    readonly status: "APPLIED" | "DENIED";
}

export type EnvironmentMutation = (
    change: Readonly<Omit<EnvironmentData, "status">>,
) => Promise<void>;

export type EnvironmentInput = EnvironmentIntent & {
    readonly operationId?: string;
    /**
     * Environment still has no persistence model. Requiring this adapter makes
     * it impossible to report a change as applied without actually storing it.
     */
    readonly apply: EnvironmentMutation;
};

/** Intercepts and records environment changes without coupling to a future map schema. */
export class EnvironmentOperator extends Operator<EnvironmentInput, EnvironmentData> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
    ) {
        super(runtime);
    }

    async execute(input: EnvironmentInput): Promise<EnvironmentData> {
        if (!input.battleId || !input.mapId || !input.change?.kind || !input.apply) {
            throw new Error("A mudança ambiental precisa de batalha, mapa, mudança e persistência.");
        }

        const battleState = await this.battleStateRepository.findById(input.battleId);
        if (!battleState || battleState.mapId !== input.mapId) {
            throw new Error("A mudança ambiental precisa ocorrer no mapa da batalha.");
        }

        const sourceToken = input.sourceTokenId
            ? await this.tokenRepository.findTokenTemplateById(input.sourceTokenId)
            : null;
        if (sourceToken && sourceToken.mapId !== input.mapId) {
            throw new Error("A origem da mudança ambiental precisa pertencer ao mapa da batalha.");
        }

        const environment = await this.runtime.intercept(InterceptorType.ENVIRONMENT_CHANGE, {
            battleId: input.battleId,
            mapId: input.mapId,
            change: {
                ...input.change,
                payload: Object.freeze({ ...input.change.payload }),
            },
            operationId: input.operationId ?? crypto.randomUUID(),
            parentOperationId: input.parentOperationId,
            cause: input.cause,
            metadata: input.metadata,
            sourceToken: sourceToken
                ? createTokenElementProfile(sourceToken)
                : undefined,
            cancelled: false,
        }, input.battleId);

        if (environment.cancelled) {
            const denied: EnvironmentData = { ...environment, status: "DENIED" };
            console.log("!!!!!!![CHEGOU ATÉ AQUI]!!!!!!")
            await this.runtime.dispatchEvent(
                denied.battleId,
                new EnvironmentChangeDeniedEvent(denied),
                {
                    environment: denied,
                    sourceTokenId: sourceToken?.id
                },
            );
            return denied;
        }

        await input.apply(environment);

        const resolved: EnvironmentData = { ...environment, status: "APPLIED" };
        await this.runtime.dispatchEvent(
            resolved.battleId,
            new EnvironmentChangedEvent(resolved),
            {
                environment: resolved,
                sourceTokenId: sourceToken?.id
            },
        );

        return resolved;
    }
}
