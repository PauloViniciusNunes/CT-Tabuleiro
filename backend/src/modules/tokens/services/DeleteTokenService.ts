import { TokenRepository } from "../repositories/TokenRepository";
import { TokenIdValidator } from "../validators/TokenIdValidator";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { UserRepository } from "@/modules/auth/repositories/UserRepository";

export class DeleteTokenService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly campaignRepository = new CampaignRepository(),
        private readonly userRepository = new UserRepository()
    ) {}

    async execute(
        userId: string,
        tokenId: string,
    ) {
        const id = TokenIdValidator.parse(tokenId);
        const token = await this.repository.findById(id);

        if(!token?.campaignId) {
            throw new Error("Token não está inserido em uma campanha!")
        }

        const campaign = await this.campaignRepository.findCampaignById(token.campaignId)

        if (!token) {
            throw new Error("Token não encontrado.");
        }

        console.log("[TOKEN USER ID]: ", token.userId)

        const user = await this.userRepository.findById(token.userId)
        console.log("[NOME DO USUÀRIO]: ", user?.name)

        console.log("[CAMPAIGN OWNER]: ", campaign?.ownerId)

        if (token.userId !== userId && userId !== campaign?.ownerId) {
            throw new Error("Você não possui acesso a este token.");
        }

        return this.repository.delete(id);
    }
}
