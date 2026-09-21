import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { TokenRepository } from "../repositories/TokenRepository";
import { TokenAccessService } from "./TokenAccessService";
import { hydrateTokenInventoryItems } from "../utils/hydrateTokenInventoryItems";
import { TokenTransformationService } from "./TokenTransformationService";

export class GetTokensService {
    constructor(
        private readonly campaignRepository = new CampaignRepository(),
        private readonly repository = new TokenRepository(),
        private readonly accessService = new TokenAccessService(),
        private readonly itemRepository = new ItemRepository(),
        private readonly transformationService = new TokenTransformationService(repository),
    ) {}

    async execute(
        campaignId: string,
        userId: string,
        mapId?: string | null,
    ) {

        const thisCampaign = await this.campaignRepository.findCampaignById(campaignId);

        if(!thisCampaign) {
            throw new Error("Campanha não pode ser encontrada.")
        }

        if(userId === thisCampaign.ownerId) {
            const tokens = await this.repository.findManyByCampaign(campaignId);
            return this.withInventoryItems(await this.transformationService.resolveMany(tokens));
        }

        if (!mapId) {
            const tokens = await this.repository.findManyByUser(userId);
            return this.withInventoryItems(await this.transformationService.resolveMany(tokens));
        }

        await this.accessService.ensureMapOwner(userId, mapId);

        const tokens = await this.repository.findManyByUser(userId);
        return this.withInventoryItems(await this.transformationService.resolveMany(tokens));
    }

    private async withInventoryItems<T extends {
        primaryHandId: string;
        offHandId: string;
        neckId: string;
        ringId: string;
        armorId: string;
        commonSlotIds: string[];
    }>(tokens: T[]) {
        return hydrateTokenInventoryItems(tokens, this.itemRepository);
    }
}
