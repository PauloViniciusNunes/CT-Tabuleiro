import { CampaignMemberRepository } from "../repositories/CampaignMembersServices";
import { UserRepository } from "@/modules/auth/repositories/UserRepository";
import { ListCampaignValidator } from "../validators/ListCampaignValidator";

export class ListCampaignsByUserIdService {

    private readonly repository = new CampaignMemberRepository()
    private readonly userRepository = new UserRepository()

    async execute(data: unknown) {

        const newData = ListCampaignValidator.parse(data)

        const user = await this.userRepository.findById(newData.userId)

        if (!user)
            throw new Error("Não foi possível encontrar usuário para FindByCampaignAndUserService.")
        
        const userId: string = newData.userId

        return await this.repository.listCampaignsByUserId(userId)
    }
}