import { CampaignRepository } from "../repositories/CampaignRepository";
import { UpdateCampaignValidator } from "../validators/UpdateCampaignValidator";

export class UpdateCampaignService {

    constructor(
        private readonly repository = new CampaignRepository()
    ) {}

    async execute(
        userId: string,
        campaignId: string,
        data: unknown,
    ) {

        const input =
            UpdateCampaignValidator.parse(data);

        const campaign =
            await this.repository.findCampaignById(campaignId);

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId !== userId) {
            throw new Error("Você não possui permissão para editar esta campanha.");
        }

        return this.repository.update(
            campaignId,
            input,
        );

    }

}