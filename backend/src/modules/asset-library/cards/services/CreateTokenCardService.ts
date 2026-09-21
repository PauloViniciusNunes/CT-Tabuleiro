import { TokenCardRepository } from "../repositories/TokenCardRepository";

import { CreateTokenCardValidator } from "../validators/CreateCardTemplateValidator";

import { TokenTemplateRepository } from "../../tokens/repositories/TokenTemplateRepository";

import { TokenInstanceAndCardMapperTokenCard } from "../mapper/TokenInstanceAndCardMapperTokenCard";

import { CardRepository } from "@/modules/cards/repositories/CardRepository";

export class CreateTokenCardService
{
    constructor(
        private readonly repository = new TokenCardRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly cardRepository = new CardRepository()        
    ) {}

    async execute(data: unknown)
    {

        const input = CreateTokenCardValidator.parse(data)

        const token = await this.tokenRepository.findTokenTemplateById(input.tokenId)

        if(!token) {
            throw new Error("Instância não encontrada.")
        }

        const card = await this.cardRepository.findCardById(input.cardId)
 
        if(!card) {
            throw new Error("Card não encontrado.")
        }


        const out = TokenInstanceAndCardMapperTokenCard(token.id, card)

        return this.repository.create(out);
    }

}