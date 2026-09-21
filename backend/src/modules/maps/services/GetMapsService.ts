import { CampaignRepository } from "../../campaigns/repositories/CampaignRepository";
import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";

import { MapRepository } from "../repositories/MapRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";

export class GetMapsService {

    constructor(

        private readonly repository =
            new MapRepository(),

        private readonly campaignRepository =
            new CampaignRepository(),

        private readonly campaignMemberRepository =
            new CampaignMemberRepository(),

        private readonly itemRepository = new ItemRepository(),

    ) {}

    async execute(

        userId: string,

        campaignId: string,

    ) {

        const campaign =
            await this.campaignRepository.findCampaignById(campaignId);

        console.log("[ID DA CAMPANHA]: ", campaignId)

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId === userId) {
            const maps = await this.repository.findManyByCampaign(campaignId);
            return Promise.all(maps.map((map) => this.withInventoryItems(map)));
        }

        const membership = await this.campaignMemberRepository.findByCampaignAndUser(
            campaignId,
            userId,
        );

        if (!membership) {
            throw new Error("Usuário não possui acesso a esta campanha.");
        }

        if (!membership.currentMapId) {
            return [];
        }

        const currentMap = await this.repository.findMapById(membership.currentMapId);

        if (!currentMap || currentMap.campaignId !== campaignId) {
            return [];
        }

        return [await this.withInventoryItems(currentMap)];

    }

    private async withInventoryItems<T extends { boardTokens: object[] }>(map: T) {
        return {
            ...map,
            boardTokens: await hydrateTokenInventoryItems(
                map.boardTokens,
                this.itemRepository,
            ),
        };
    }

}
