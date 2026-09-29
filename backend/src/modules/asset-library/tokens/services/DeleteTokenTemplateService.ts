import { TokenTemplateRepository } from "../repositories/TokenTemplateRepository";
import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { BattleSetter } from "@/modules/engine/context/BattleSetter";
import { emitBattleRuntimeCleanup } from "@/modules/engine/services/BattleEngineEndBattleService";

export class DeleteTokenTemplateService {
    constructor(
        private readonly repository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
        private readonly battleSetter = new BattleSetter(),
    ) {}

    async execute(userId: string, id: string) {
        const tokenTemplate = await this.repository.findTokenTemplateById(id);
        if (!tokenTemplate) {
            throw new Error("Template não encontrado.");
        }

        const map = await this.mapRepository.findMapById(tokenTemplate.mapId);
        if (!map) {
            throw new Error("Token Template criado sem mapId?");
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        if (!campaign) {
            throw new Error("Não foi possível encontrar campanha...");
        }
        if (userId !== campaign.ownerId) {
            throw new Error("Apenas o dono da campanha pode remover tokens.");
        }

        const deletion = await this.repository.deleteWithBattleSafety(id);

        if (deletion.endedBattle) {
            try {
                const resetTokens = await this.battleSetter.resetTokenRuntimeStats(map.id);
                resetTokens.forEach((token) => runtime.emit(SocketEvent.TOKEN_UPDATED, token));
            } catch (error) {
                console.error("Não foi possível resetar os tokens após encerrar a batalha:", error);
            }

            emitBattleRuntimeCleanup(deletion.endedBattle);
        }

        runtime.emit(SocketEvent.TOKEN_DELETED, deletion.token);
    }
}
