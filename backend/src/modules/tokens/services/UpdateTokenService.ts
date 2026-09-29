import { TokenRepository } from "../repositories/TokenRepository";
import { TokenIdValidator } from "../validators/TokenIdValidator";
import { UpdateTokenValidator } from "../validators/UpdateTokenValidator";
import { mapUpdateTokenInput } from "./TokenMapper";
import { TokenTransformationService } from "./TokenTransformationService";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";

export class UpdateTokenService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly transformationService = new TokenTransformationService(repository),
        private readonly campaignRepository = new CampaignRepository(),
    ) {}

    async execute(
        userId: string,
        tokenId: string,
        data: unknown,
    ) {
        const id = TokenIdValidator.parse(tokenId);
        const input = UpdateTokenValidator.parse(data);
        const token = await this.repository.findById(id);

        if (!token) {
            throw new Error("Token não encontrado.");
        }

        const campaign = await this.campaignRepository.findCampaignById(token.campaignId);
        const canUpdate = token.userId === userId || campaign?.ownerId === userId;
        if (!canUpdate) {
            throw new Error("Você não possui acesso a este token.");
        }

        const requestedOwnerId = input.userId;
        const isOwnershipTransfer = requestedOwnerId !== undefined &&
            requestedOwnerId !== token.userId;
        if (isOwnershipTransfer) {
            if (!campaign || campaign.ownerId !== userId) {
                throw new Error("Apenas o dono da campanha pode transferir um token.");
            }

            const belongsToCampaign = requestedOwnerId === campaign.ownerId ||
                campaign.members.some((member) => member.userId === requestedOwnerId);
            if (!belongsToCampaign) {
                throw new Error("O novo dono precisa participar desta campanha.");
            }
        }



        const resolvedInput = await this.transformationService.prepareUpdate(token, input);
        const updated = await this.repository.update(
            id,
            mapUpdateTokenInput(resolvedInput),
        );
        const resolvedUpdated = await this.transformationService.resolveOne(updated);
        await this.transformationService.refreshDescendantSnapshots(resolvedUpdated);

        return resolvedUpdated;
    }
}
