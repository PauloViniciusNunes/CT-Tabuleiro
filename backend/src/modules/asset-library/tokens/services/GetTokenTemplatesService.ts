// GetTokenTemplatesService.ts

import { TokenTemplateRepository } from "../repositories/TokenTemplateRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { hydrateTokenInventoryItems } from "@/modules/tokens/utils/hydrateTokenInventoryItems";
export class GetTokenTemplatesService {

    constructor(
        private readonly repository = new TokenTemplateRepository(),
        private readonly itemRepository = new ItemRepository(),
    ) {}

    async execute(userId: string) {
        const tokens = await this.repository.list(userId);
        return hydrateTokenInventoryItems(tokens, this.itemRepository);
    }

}
