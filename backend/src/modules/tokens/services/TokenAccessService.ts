import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";

export class TokenAccessService {
    constructor(
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
    ) {}

    async ensureMapOwner(
        userId: string,
        mapId: string,
    ) {
        const map = await this.mapRepository.findMapById(mapId);

        if (!map) {
            throw new Error("Mapa não encontrado.");
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId !== userId) {
            throw new Error("Você não possui acesso a este mapa.");
        }

        return map;
    }
}
