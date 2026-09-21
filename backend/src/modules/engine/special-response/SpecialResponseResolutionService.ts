import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { PendingGetter } from "../context/PendingGetter";
import { PendingSetter } from "../context/PendingSetter";
import { syncBattleState } from "../utils/syncBattleState";
import { emitPendingSpecialResponse } from "./emitSpecialResponse";
import { SpecialResponseHandlerRegistry } from "./SpecialResponseHandlerRegistry";
import {
    specialResponseCommandSchema,
    validateSpecialResponseValues,
} from "./SpecialResponseValidation";
import type { SpecialResponseResolution } from "./types";
import { ensureProficiencyRollReductionHandlerRegistered } from "./handlers/ProficiencyRollReductionHandler";
import { ensureCancelDamageFormularyHandlerRegistered } from "../mechanic/interceptors/CancelDamageFormularyInteceptor";

export class SpecialResponseResolutionService {
    private static readonly processingRequests = new Set<string>();

    constructor(
        private readonly battleRepository = new BattleStateRepository(),
        private readonly pendingQueueRepository = new PendingQueueRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
        private readonly pendingGetter = new PendingGetter(pendingQueueRepository),
        private readonly pendingSetter = new PendingSetter(pendingQueueRepository),
    ) {}

    async execute(userId: string, data: unknown): Promise<SpecialResponseResolution> {
        // Handlers are restored during request handling as pending responses can
        // survive a server restart.
        ensureProficiencyRollReductionHandlerRegistered();
        ensureCancelDamageFormularyHandlerRegistered();
        const command = specialResponseCommandSchema.parse(data);
        const [battle, pendingQueue] = await Promise.all([
            this.battleRepository.findById(command.battleId),
            this.pendingQueueRepository.findByBattleStateId(command.battleId),
        ]);
        if (!battle || battle.status !== "In Battle" || !pendingQueue) {
            throw new Error("A batalha da resposta especial não está disponível.");
        }

        const pending = await this.pendingGetter.getPendingSpecialResponse(pendingQueue.id);
        if (!pending || pending.requestId !== command.requestId) {
            throw new Error("A resposta especial expirou ou já foi resolvida.");
        }

        const map = await this.mapRepository.findMapById(battle.mapId);
        const campaign = map
            ? await this.campaignRepository.findCampaignById(map.campaignId)
            : null;
        const authorized = userId === pending.responderUserId || userId === campaign?.ownerId;
        if (!authorized) {
            throw new Error("Este usuário não pode responder ao formulário especial.");
        }

        if (SpecialResponseResolutionService.processingRequests.has(pending.requestId)) {
            throw new Error("Esta resposta especial já está sendo processada.");
        }

        const resolution: SpecialResponseResolution = command.action === "cancel"
            ? { action: "cancel", values: {} }
            : {
                action: "submit",
                values: validateSpecialResponseValues(pending, command.values),
            };

        SpecialResponseResolutionService.processingRequests.add(pending.requestId);
        try {
            await SpecialResponseHandlerRegistry.dispatch(pending.handlerKey, {
                pending,
                resolution,
                resolvedByUserId: userId,
            });
            await this.pendingSetter.cleanPendingSpecialResponse(pendingQueue.id);
            emitPendingSpecialResponse(battle.mapId, null);
            await syncBattleState(battle.id);
            return resolution;
        } finally {
            SpecialResponseResolutionService.processingRequests.delete(pending.requestId);
        }
    }
}
