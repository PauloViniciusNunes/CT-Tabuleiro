import { TokenTemplateRepository } from "../repositories/TokenTemplateRepository";
import { CreateTokenTemplateValidator } from "../validators/CreateTokenTemplateValidator";
import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";
import { TokenMapperTokenInstance } from "../mapper/TokenMapperTokenInstance";
import { TokenCardRepository } from "../../cards/repositories/TokenCardRepository";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { CampaignRepository } from "@/modules/campaigns/repositories/CampaignRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";
import { TokenTransformationService } from "@/modules/tokens/services/TokenTransformationService";

export class CreateTokenTemplateService {

    constructor(
        private readonly repository = new TokenTemplateRepository(),
        private readonly tokenRepository = new TokenRepository(),
        private readonly mapRepository = new MapRepository(),
        private readonly campaignRepository = new CampaignRepository(),        
        private readonly tokenCardRepository = new TokenCardRepository(),
        private readonly itemRepository = new ItemRepository(),
        private readonly transformationService = new TokenTransformationService(tokenRepository),
    ) {}

    async execute(data: unknown) {

        const rawData = CreateTokenTemplateValidator.parse(data);

        const tokenId = rawData.tokenId;
        const mapId = rawData.mapId;
        const col = rawData.col
        const row = rawData.row

        const token = await this.tokenRepository.findById(tokenId);

        if (!token)
            throw new Error("Impossível realizar instância sem existência de um Template Token.");

        const resolvedToken = await this.transformationService.resolveOne(token);
        const input = TokenMapperTokenInstance(resolvedToken, mapId,col,row);

        const create = await this.repository.create(input);
        const [hydratedToken] = await hydrateTokenInventoryItems(
            [create],
            this.itemRepository,
        );

        runtime.emit(
            SocketEvent.TOKEN_CREATED,
            hydratedToken,
        );

        return hydratedToken;
    }
}
