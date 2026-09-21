import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";
import { CampaignRepository } from "../repositories/CampaignRepository";

export class GetCampaignMapRoutingService {
    constructor(
        private readonly campaignRepository = new CampaignRepository(),
        private readonly campaignMemberRepository = new CampaignMemberRepository(),
    ) {}

    async execute(userId: string, campaignId: string) {
        const campaign = await this.campaignRepository.findCampaignById(campaignId);

        if (!campaign) {
            throw new Error("Campanha não encontrada.");
        }

        const isOwner = campaign.ownerId === userId;
        const membership = isOwner
            ? null
            : await this.campaignMemberRepository.findByCampaignAndUser(campaignId, userId);

        if (!isOwner && !membership) {
            throw new Error("Usuário não pertence a esta campanha.");
        }

        const members = await this.campaignMemberRepository.listMembersByCampaignId(campaignId);
        const visibleMembers = isOwner
            ? members.filter((member) => member.userId !== campaign.ownerId)
            : members.filter((member) => member.userId === userId);

        return {
            campaignId,
            isOwner,
            members: visibleMembers.map((member) => ({
                userId: member.userId,
                currentMapId: member.currentMapId,
                user: {
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                },
            })),
        };
    }
}
