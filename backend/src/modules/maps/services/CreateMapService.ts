import { MapRepository } from "../repositories/MapRepository";
import { CampaignRepository } from "../../campaigns/repositories/CampaignRepository";

import { CreateMapValidator } from "../validators/CreateMapValidator";

export class CreateMapService {

    constructor(
        private readonly repository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),
    ) {}

    async execute(
        userId: string,
        data: unknown,
    ) {

        const input =
            CreateMapValidator.parse(data);

        console.log("ID da campanha obtido: ", input.campaignId)

        const campaign =
            await this.campaignRepository.findCampaignById(
                input.campaignId,
            );

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId !== userId) {
            throw new Error("Você não possui acesso a esta campanha.");
        }

        return this.repository.create(input);

    }

}