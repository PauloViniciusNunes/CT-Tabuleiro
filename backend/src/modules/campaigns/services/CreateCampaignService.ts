import { CampaignRepository } from "../repositories/CampaignRepository";
import { CreateCampaignValidator } from "../validators/CreateCampaignValidator";
import { CampaignMemberRepository } from "@/modules/asset-library/members/repositories/CampaignMembersServices";

export class CreateCampaignService {

    constructor(
        private readonly repository = new CampaignRepository(),
        private readonly campaignMemberRepository = new CampaignMemberRepository()
    ) {}

    async execute(
        ownerId: string,
        data: unknown,
    ) {

        const input = CreateCampaignValidator.parse(data);

        const created = await this.repository.create({
            ...input,
            ownerId,
        });

        await this.campaignMemberRepository.addMember(created.id, ownerId)

        return created
    }

}