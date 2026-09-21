import { CampaignRepository } from "../repositories/CampaignRepository";

export class GetCampaignByIdService {

    constructor(
        private readonly repository = new CampaignRepository()
    ){}

    async execute(id: string){
        return this.repository.findCampaignById(id)
    }

}