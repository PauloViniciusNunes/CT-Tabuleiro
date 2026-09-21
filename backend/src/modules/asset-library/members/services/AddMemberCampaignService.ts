import { NextRequest } from "next/server";

import { CampaignMemberRepository } from "../repositories/CampaignMembersServices";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { UserRepository } from "@/modules/auth/repositories/UserRepository";
import { AddMemberCampaignValidator } from "../validators/AddMemberCampaignValidator";

export class AddMemberCampaignService {

    private readonly repository = new CampaignMemberRepository()
    private readonly userRepository = new UserRepository()
    private readonly campaignRepository = new CampaignRepository()

    async execute(data: unknown) {

        const newData = AddMemberCampaignValidator.parse(data)
        const campaign = await this.campaignRepository.findCampaignById(newData.campaignId)

        if (!campaign)
            throw new Error("Não foi possível encontrar a campanha para AddMemberCampaignService.")

        const user = await this.userRepository.findById(newData.userId)

        if (!user)
            throw new Error("Não foi possível encontrar usuário para AddMemberCampaignService.")

        const campaignId: string = newData.campaignId
        const userId: string     = newData.userId

        return await this.repository.addMember(campaignId, userId)
    }
}