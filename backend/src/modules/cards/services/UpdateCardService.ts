import { Prisma } from "@prisma/client";

import { CardRepository } from "../repositories/CardRepository";
import { UpdateCardValidator } from "../validators/UpdateCardValitador";

export class UpdateCardService {

    constructor(
        private readonly repository = new CardRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
        data: unknown,
    ) {

        const input =
            UpdateCardValidator.parse(data);

        const card =
            await this.repository.findCardById(id);

        if (!card) {
            throw new Error("Card não encontrado.");
        }

        if (card.userId !== userId) {
            throw new Error("Usuário não é o dono do card.");
        }

        return this.repository.update(
            id,
            {
                ...input,
                baseDice: input.baseDice as Prisma.InputJsonValue | undefined,
                target: input.target as Prisma.InputJsonValue | undefined,
                effectToApply: input.effectToApply as Prisma.InputJsonValue | undefined,
            },
        );

    }

}