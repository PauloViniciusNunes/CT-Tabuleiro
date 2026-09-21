import { Prisma } from "@prisma/client";

import { CardRepository } from "../repositories/CardRepository";
import { CreateCardValidator } from "../validators/CreateCardValidator";

export class CreateCardService {

    constructor(
        private readonly repository = new CardRepository(),
    ) {}

    async execute(
        userId: string,
        tokenId: string | null | undefined,
        data: unknown,
    ) {

        const input = CreateCardValidator.parse(data);
            
        return this.repository.create({
            ...input,

            baseDice: input.baseDice as Prisma.InputJsonValue | undefined,
            target: input.target as Prisma.InputJsonValue,
            effectToApply: input.effectToApply as Prisma.InputJsonValue | undefined,

            user: {
                connect: {
                    id: userId,
                },
            },
            
            // Ajustado para passar um array [{ id: tokenId }] exigido pelo Muitos para Muitos
            tokens: tokenId && tokenId.trim() !== "" 
                ? { connect: [{ id: tokenId }] } 
                : undefined
        });

    }

}