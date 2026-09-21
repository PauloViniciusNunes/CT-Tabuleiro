import { CampaignRepository } from "../../campaigns/repositories/CampaignRepository";
import { UpdateMapValidator } from "../validators/UpdateMapValidator";
import { MapRepository } from "../repositories/MapRepository";

export class UpdateMapService {

    constructor(

        private readonly repository =
            new MapRepository(),

        private readonly campaignRepository =
            new CampaignRepository(),

    ) { }

    async execute(
        userId: string,
        campaignId: string,
        mapId: string,
        data: unknown
    ) {
        const input = UpdateMapValidator.parse(data)
        console.log("CAMPANHA ID: ", campaignId)
        const campaign = await this.campaignRepository.findCampaignById(campaignId)

        if(!campaign) {
            throw new Error("Nenhuma campanha associada ao mapa.")
        }

        if(campaign.ownerId !== userId) {
            throw new Error("Usuário não tem permissão para atualizar o mapa.")
        }

        const map = await this.repository.findMapById(mapId)

        if(!map) {
            throw new Error("Mapa inexistente.")
        }

        if(map.campaignId !== campaignId) {
            throw new Error("Mapa não pertence a campanha requisitada.")
        }

        return this.repository.update(mapId,input)
    }

}