import { TokenCardRepository } from "../repositories/TokenCardRepository";

import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";

import { UpdateTokenCardValidator } from "../validators/UpdateCardTemplateValidator";


export class UpdateTokenCardService {

    constructor(
        private readonly repository = new TokenCardRepository(),
        private readonly tokenRepository = new TokenRepository(),
    ) { }

    async execute(id: string, data: unknown) {


        const input = UpdateTokenCardValidator.parse(data)

        const tokenCard = await this.repository.find(id)

        if(!tokenCard) {
            throw new Error("Relação não existe.")
        }

        return this.repository.update(id, {
            card: {
                connect: {
                    id: input.cardId,
                },
            },
            token: {
                connect: {
                    id: input.tokenId,
                },
            },
        })

    }

}
