import { CampaignRepository } from "../../campaigns/repositories/CampaignRepository";
import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";

import { MapRepository } from "../repositories/MapRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";

export class GetMapByIdService {

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

        mapId: string,

    ) {

        const map =
            await this.repository.findMapById(mapId);

        if (!map) {
            throw new Error("Mapa não encontrado.");
        }

        const campaign =
            await this.campaignRepository.findCampaignById(
                map.campaignId,
            );

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId === userId) {
            return this.withInventoryItems(map);
        }

        const membership = await this.campaignMemberRepository.findByCampaignAndUser(
            campaign.id,
            userId,
        );

        if (!membership || membership.currentMapId !== map.id) {
            throw new Error("Você não possui acesso a este mapa.");
        }

        return this.withInventoryItems(map);

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
