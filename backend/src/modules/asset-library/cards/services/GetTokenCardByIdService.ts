import { TokenCardRepository } from "../repositories/TokenCardRepository";

export class GetTokenCardByIdService
{
    constructor(
        private readonly repository = new TokenCardRepository(),
     
    ) {}

    async execute(id: string) {
        return this.repository.find(id)
    }

}