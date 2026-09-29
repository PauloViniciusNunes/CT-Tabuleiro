import { TokenRepository } from "../repositories/TokenRepository";
import { TokenIdValidator } from "../validators/TokenIdValidator";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";

export class DeleteTokenService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly campaignRepository = new CampaignRepository(),
    ) {}

    async execute(userId: string, tokenId: string) {
        const id = TokenIdValidator.parse(tokenId);
        const token = await this.repository.findById(id);
        if (!token) {
            throw new Error("Token não encontrado.");
        }
        if (!token.campaignId) {
            throw new Error("Token não está inserido em uma campanha!");
        }

        const campaign = await this.campaignRepository.findCampaignById(token.campaignId);
        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }
        if (userId !== campaign.ownerId) {
            throw new Error("Apenas o dono da campanha pode remover tokens.");
        }

        return this.repository.delete(id);
    }
}
