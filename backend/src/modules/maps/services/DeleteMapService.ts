import { CampaignRepository } from "../../campaigns/repositories/CampaignRepository";

import { MapRepository } from "../repositories/MapRepository";
import { DeleteMapValidator } from "../validators/DeleteMapValidator";

export class DeleteMapService {
    constructor(

        private readonly repository =
            new MapRepository(),

        private readonly campaignRepository =
            new CampaignRepository(),

    ) { }

    async execute(
        campaignId: string,
        userId: string,
        data: unknown,
    ) {

        const campaign = await this.campaignRepository.findCampaignById(campaignId);

        if(!campaign) {
            throw new Error("Campanha não encontrada.")
        }

        if(campaign.ownerId !== userId) {
            throw new Error("Usuário não é dono da campanha.")
        }

        const input = DeleteMapValidator.parse(data)

        const map = await this.repository.findMapById(input.id)

        if(!map) {
            throw new Error("Mapa inexistente.")
        }

        if(map.campaignId !== campaignId) {
            throw new Error("Mapa especificado não pertence a Campanha especificada.")
        }

        return this.repository.delete(map.id)

    }
}