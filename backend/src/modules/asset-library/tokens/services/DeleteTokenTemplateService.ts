import { TokenTemplateRepository } from "../repositories/TokenTemplateRepository";
import { TokenCardRepository } from "../../cards/repositories/TokenCardRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";

export class DeleteTokenTemplateService {

    constructor(
        private readonly repository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),        
        private readonly tokenCardRepository = new TokenCardRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
    ) {

        const tokenTemplate =
            await this.repository.findTokenTemplateById(id);

        if (!tokenTemplate) {
            throw new Error("Template não encontrado.");
        }
        const map = await this.mapRepository.findMapById(tokenTemplate.mapId)

        if(!map)
            throw new Error("Token Template criado sem mapId?")

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId)

        if(!campaign)
            throw new Error("Não foi possível encontrar campanha...")

        const ownerId = campaign.ownerId

        if (tokenTemplate.userId !== userId && userId !== ownerId) {
            throw new Error("Usuário não é o dono do template.");
        }

        await this.tokenCardRepository.deleteByTokenId(id)
        await this.repository.delete(id);

        runtime.emit(
            SocketEvent.TOKEN_DELETED,
            tokenTemplate,
        );

    }

}