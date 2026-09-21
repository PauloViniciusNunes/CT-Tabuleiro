import { TokenCardRepository } from "../repositories/TokenCardRepository";

export class DeleteTokenCardService
{

    constructor(
        private readonly repository = new TokenCardRepository(),
    ) {}

    async execute(id: string) {
        const tokenCard = await this.repository.find(id)

        if(!tokenCard) {
            throw new Error("Relação não encontrada.")
        }

        return this.repository.delete(id)
        
    }

}
