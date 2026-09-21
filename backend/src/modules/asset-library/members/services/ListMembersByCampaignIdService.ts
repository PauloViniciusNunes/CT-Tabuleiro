import { CampaignMemberRepository } from "../repositories/CampaignMembersServices";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { ListMemberValidator } from "../validators/ListMembersValidator";

export class ListMembersByCampaignIdService {

    private readonly repository = new CampaignMemberRepository()
    private readonly campaignRepository = new CampaignRepository()

    async execute(data: unknown) {

        console.log("[DATA]: ", data)

        const newData = ListMemberValidator.parse(data)
        const campaign = await this.campaignRepository.findCampaignById(newData.campaignId)

        if (!campaign)
            throw new Error("Não foi possível encontrar a campanha para ListMembersByCampaignIdService.")


        const campaignId: string = newData.campaignId

        return await this.repository.listMembersByCampaignId(campaignId)
    }
}