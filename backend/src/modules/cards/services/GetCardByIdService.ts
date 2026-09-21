import { CardRepository } from "../repositories/CardRepository";

export class GetCardByIdService {

    constructor(
        private readonly repository = new CardRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
    ) {

        const card =
            await this.repository.findCardById(id);

        if (!card) {
            throw new Error("Card não encontrado.");
        }

        if (card.userId !== userId) {
            throw new Error("Usuário não é o dono do card.");
        }

        return card;

    }

}