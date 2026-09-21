import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { PendingGetter } from "../context/PendingGetter";
import { PendingSetter } from "../context/PendingSetter";
import { emitPendingSpecialResponse } from "./emitSpecialResponse";
import { SpecialResponseHandlerRegistry } from "./SpecialResponseHandlerRegistry";
import {
    pendingSpecialResponseSchema,
    validateSpecialResponseFields,
} from "./SpecialResponseValidation";
import type {
    PendingSpecialResponse,
    RequestSpecialResponseInput,
} from "./types";

function jsonRecord(
    value: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
    try {
        return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
    } catch {
        throw new Error("O contexto da resposta especial precisa ser serializável em JSON.");
    }
}

/** Entry point usable by Services, Behaviors and Interceptors. */
export class SpecialResponseRequestService {
    constructor(
        private readonly battleRepository = new BattleStateRepository(),
        private readonly pendingQueueRepository = new PendingQueueRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly pendingGetter = new PendingGetter(pendingQueueRepository),
        private readonly pendingSetter = new PendingSetter(pendingQueueRepository),
    ) {}

    async execute(input: RequestSpecialResponseInput): Promise<PendingSpecialResponse> {
        if (!SpecialResponseHandlerRegistry.has(input.handlerKey)) {
            throw new Error(
                `Registre o handler "${input.handlerKey}" antes de abrir o formulário especial.`,
            );
        }

        const [battle, pendingQueue, responder, requester] = await Promise.all([
            this.battleRepository.findById(input.battleId),
            this.pendingQueueRepository.findByBattleStateId(input.battleId),
            this.tokenRepository.findTokenTemplateById(input.responderTokenId),
            input.requestedByTokenId
                ? this.tokenRepository.findTokenTemplateById(input.requestedByTokenId)
                : Promise.resolve(null),
        ]);
        if (!battle || battle.status !== "In Battle" || !pendingQueue) {
            throw new Error("A resposta especial só pode ser aberta em uma batalha ativa.");
        }
        if (!responder || responder.mapId !== battle.mapId || !responder.userId) {
            throw new Error("O token respondente não pertence ao mapa da batalha.");
        }
        if (input.requestedByTokenId && (!requester || requester.mapId !== battle.mapId)) {
            throw new Error("O token solicitante não pertence ao mapa da batalha.");
        }
        if (await this.pendingGetter.getPendingSpecialResponse(pendingQueue.id)) {
            throw new Error("Já existe uma resposta especial pendente nesta batalha.");
        }

        const pending = pendingSpecialResponseSchema.parse({
            requestId: crypto.randomUUID(),
            battleId: battle.id,
            mapId: battle.mapId,
            responderTokenId: responder.id,
            responderUserId: responder.userId,
            requestedByTokenId: input.requestedByTokenId,
            title: input.title,
            description: input.description,
            fields: validateSpecialResponseFields(input.fields),
            handlerKey: input.handlerKey,
            context: jsonRecord(input.context),
            createdAt: new Date().toISOString(),
            status: "PENDING",
        }) as PendingSpecialResponse;

        await this.pendingSetter.setPendingSpecialResponse(pendingQueue.id, pending);
        emitPendingSpecialResponse(battle.mapId, pending);
        return pending;
    }
}
