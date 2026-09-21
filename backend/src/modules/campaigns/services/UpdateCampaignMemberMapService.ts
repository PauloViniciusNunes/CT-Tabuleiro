import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { CampaignRepository } from "../repositories/CampaignRepository";
import { UpdateCampaignMemberMapValidator } from "../validators/UpdateCampaignMemberMapValidator";

export class UpdateCampaignMemberMapService {
    constructor(
        private readonly campaignRepository = new CampaignRepository(),
        private readonly campaignMemberRepository = new CampaignMemberRepository(),
        private readonly mapRepository = new MapRepository(),
    ) {}

    async execute(userId: string, campaignId: string, data: unknown) {
        const input = UpdateCampaignMemberMapValidator.parse(data);
        const campaign = await this.campaignRepository.findCampaignById(campaignId);

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        if (campaign.ownerId !== userId) {
            throw new Error("Apenas o mestre pode direcionar jogadores entre mapas.");
        }

        const map = await this.mapRepository.findMapById(input.mapId);

        if (!map || map.campaignId !== campaignId) {
            throw new Error("O mapa de destino não pertence a esta campanha.");
        }

        const uniqueUserIds = [...new Set(input.userIds)];

        if (uniqueUserIds.includes(campaign.ownerId)) {
            throw new Error("O mestre não pode ser direcionado junto com os jogadores.");
        }

        const memberships = await Promise.all(
            uniqueUserIds.map((memberId) =>
                this.campaignMemberRepository.findByCampaignAndUser(campaignId, memberId),
            ),
        );

        if (memberships.some((membership) => !membership)) {
            throw new Error("Todos os jogadores direcionados devem pertencer à campanha.");
        }

        await this.campaignMemberRepository.setCurrentMapForMembers(
            campaignId,
            uniqueUserIds,
            map.id,
        );

        runtime.emit(SocketEvent.CAMPAIGN_MEMBER_MAP_UPDATED, {
            campaignId,
            userIds: uniqueUserIds,
        });

        return {
            campaignId,
            mapId: map.id,
            userIds: uniqueUserIds,
        };
    }
}
