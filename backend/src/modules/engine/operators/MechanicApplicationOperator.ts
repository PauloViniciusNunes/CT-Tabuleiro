import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { BattleSetter } from "../context/BattleSetter";
import { MechanicAppliedEvent } from "../mechanic/events/MechanicAppliedEvent";
import { MechanicFactory } from "../mechanic/MechanicFactory";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import {
    createTokenElementProfile,
    type TokenElementProfile,
} from "../utils/elementalAffinity";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface MechanicApplicationIntent extends OperationIntent {
    readonly sourceTokenId: string;
    readonly tag: string;
    readonly mechanicMetadata?: Readonly<Record<string, unknown>>;
}

export interface MechanicApplicationData
    extends MechanicApplicationIntent, OperationContext, InterceptableData {
    readonly targetTokenId: string;
    readonly sourceToken: TokenElementProfile;
    readonly targetToken: TokenElementProfile;
    readonly instance?: MechanicInstance;
}

export type MechanicApplicationInput = MechanicApplicationIntent & {
    readonly operationId?: string;
};

/** Creates a MechanicInstance through the same interception boundary as other engine operations. */
export class MechanicApplicationOperator extends Operator<
    MechanicApplicationInput,
    MechanicApplicationData
> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime);
    }

    async execute(input: MechanicApplicationInput): Promise<MechanicApplicationData> {
        if (!input.battleId || !input.sourceTokenId || !input.tag) {
            throw new Error("A aplicação de mecânica precisa de batalha, origem e tag.");
        }

        const battleState = await this.battleStateRepository.findById(input.battleId);
        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha da aplicação de mecânica.");
        }

        const configuredTargetId = input.mechanicMetadata?.targetId;
        const targetTokenId = typeof configuredTargetId === "string"
            ? configuredTargetId
            : input.sourceTokenId;
        const [sourceToken, targetToken] = await Promise.all([
            this.tokenRepository.findTokenTemplateById(input.sourceTokenId),
            this.tokenRepository.findTokenTemplateById(targetTokenId),
        ]);

        if (
            !sourceToken ||
            !targetToken ||
            sourceToken.mapId !== battleState.mapId ||
            targetToken.mapId !== battleState.mapId
        ) {
            throw new Error("Origem e alvo da mecânica precisam pertencer ao mapa da batalha.");
        }

        const application = await this.runtime.intercept(
            InterceptorType.MECHANIC_APPLICATION,
            {
                ...input,
                operationId: input.operationId ?? crypto.randomUUID(),
                mechanicMetadata: Object.freeze({ ...(input.mechanicMetadata ?? {}) }),
                targetTokenId,
                sourceToken: createTokenElementProfile(sourceToken),
                targetToken: createTokenElementProfile(targetToken),
                cancelled: false,
            },
            input.battleId,
        );

        if (application.cancelled) {
            return application;
        }

        const instance = MechanicFactory.create(
            application.sourceTokenId,
            application.tag,
            { ...application.mechanicMetadata },
        );

        await this.battleSetter.updateActiveMechanics(
            application.battleId,
            (activeMechanics) => [...activeMechanics, instance],
        );

        const resolved: MechanicApplicationData = {
            ...application,
            instance,
        };

        await this.runtime.dispatchEvent(
            resolved.battleId,
            new MechanicAppliedEvent(resolved),
            { application: resolved },
        );

        return resolved;
    }
}
