import { TokenRepository } from "../repositories/TokenRepository";
import type { CreateTokenDAO } from "../dao/CreateTokenDAO";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "../utils/hydrateTokenInventoryItems";
import { mapCreateTokenInput } from "./TokenMapper";
import { TokenTransformationService } from "./TokenTransformationService";
import { CreateTokenValidator } from "../validators/CreateTokenValidator";


export class CreateTokenService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly itemRepository = new ItemRepository(),
        private readonly transformationService = new TokenTransformationService(repository),
    ) { }
    
    async execute(validatedBody: ReturnType<typeof CreateTokenValidator.parse>) {
        const resolvedInput = await this.transformationService.prepareCreate(validatedBody);
        const tokenData: CreateTokenDAO = mapCreateTokenInput(
            resolvedInput,
            resolvedInput.userId,
        );

        // 3. Chama a sua rota/DAO passando o dado perfeitamente formatado
        const createdToken = await this.repository.create(tokenData);
        const [hydratedToken] = await hydrateTokenInventoryItems(
            [createdToken],
            this.itemRepository,
        );

        return hydratedToken;
    }
}
