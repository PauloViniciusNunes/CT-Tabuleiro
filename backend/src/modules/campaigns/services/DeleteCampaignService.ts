import { CampaignRepository } from "../repositories/CampaignRepository";

export class DeleteCampaignService {

    constructor(
        private readonly repository = new CampaignRepository()
    ) { }

    async execute(userId: string, id: string) {

        const campaign = await this.repository.findCampaignById(id);

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if(campaign.ownerId !== userId) {
            throw new Error("Usuário não é o dono da campanha.");
        }

        return this.repository.delete(id)

    }

}