import { TokenCardRepository } from "../repositories/TokenCardRepository";

import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";


export class GetTokenCardsService {

    constructor(
        private readonly repository = new TokenCardRepository(),
        private readonly tokenRepository = new TokenRepository(),
    ) { }

    async execute(tokenId: string) {

        const token = await this.tokenRepository.findById(tokenId)

        if (!token) {
            throw new Error("Token não encontrado.")
        }

        return this.repository.list(tokenId)

    }

}
