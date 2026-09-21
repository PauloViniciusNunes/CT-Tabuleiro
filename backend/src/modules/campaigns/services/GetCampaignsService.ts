import { CampaignRepository } from "../repositories/CampaignRepository";

export class GetCampaignsService {

    constructor(
        private readonly repository = new CampaignRepository()
    ) {}

    async execute(userId: string) {

        return this.repository.findManyByOwner(userId);

    }

}