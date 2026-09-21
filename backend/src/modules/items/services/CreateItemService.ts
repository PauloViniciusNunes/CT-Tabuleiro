import { Prisma } from "@prisma/client";

import { ItemRepository } from "../repositories/ItemRepository";
import { CreateItemValidator } from "../validators/CreateItemValidator";
import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";

export class CreateItemService {

    constructor(
        private readonly repository = new ItemRepository(),
        private readonly tokenReposirory = new TokenRepository(),
        private readonly cardRepository = new CardRepository(),
    ) {}

    async execute(
        userId: string,
        tokenId: string | null | undefined, // Ajustado para aceitar null também por segurança
        data: unknown,
    ) {

        const input = CreateItemValidator.parse(data);
        const cardsIds = [...new Set(input.cardsIds)];
        const referencedCardIds = input.artficeSettings.cardDispachId
            ? [...new Set([...cardsIds, input.artficeSettings.cardDispachId])]
            : cardsIds;

        await this.assertCardsBelongToUser(userId, referencedCardIds);

        if(tokenId !== "" && tokenId !== null && tokenId !== undefined) {
            const token = await this.tokenReposirory.findById(tokenId)
            if(!token) throw new Error("ID de token informado é inválido.")
        }

        return this.repository.create({
            ...input,
            cardsIds,
            slot: input.isArtifice ? "inventory-only" : input.slot,

            craftableWith: input.craftableWith as Prisma.InputJsonValue | undefined,
            artficeSettings: input.artficeSettings as Prisma.InputJsonValue,
            habilityCards: input.habilityCards as Prisma.InputJsonValue | undefined,
            vfxUrl: input.vfxUrl as Prisma.InputJsonValue | undefined,

            user: {
                connect: {
                    id: userId,
                },
            },
            
            // 1. Mudou para 'tokens' (plural) refletindo o novo schema
            // 2. O 'connect' agora recebe um array de objetos [{ id: tokenId }]
            tokens: tokenId && tokenId.trim() !== ""
                ? { connect: [{ id: tokenId }] }
                : undefined
        });

    }

    private async assertCardsBelongToUser(userId: string, cardsIds: string[]) {
        if (cardsIds.length === 0) {
            return;
        }

        const cards = await this.cardRepository.findManyByIds(cardsIds);

        if (
            cards.length !== cardsIds.length ||
            cards.some((card) => card.userId !== userId)
        ) {
            throw new Error("Um ou mais cards associados são inválidos.");
        }
    }

}
