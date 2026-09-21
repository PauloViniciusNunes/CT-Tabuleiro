import { CardRepository } from "../repositories/CardRepository";

export class GetCardsService {

    constructor(
        private readonly repository = new CardRepository(),
    ) {}

    async execute(userId: string) {
        return this.repository.findManyByOwner(userId);
    }

}