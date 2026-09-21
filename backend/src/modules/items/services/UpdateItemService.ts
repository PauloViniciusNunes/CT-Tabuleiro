import { Prisma } from "@prisma/client";

import { ItemRepository } from "../repositories/ItemRepository";
import { UpdateItemValidator } from "../validators/UpdateItemValidator";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";

export class UpdateItemService {

    constructor(
        private readonly repository = new ItemRepository(),
        private readonly cardRepository = new CardRepository(),
    ) {}

    async execute(
        userId: string,
        id: string,
        data: unknown,
    ) {

        const input =
            UpdateItemValidator.parse(data);

        const item =
            await this.repository.findItemById(id);

        if (!item) {
            throw new Error("Item não encontrado.");
        }

        if (item.userId !== userId) {
            throw new Error("Usuário não é o dono do item.");
        }

        const cardsIds = input.cardsIds
            ? [...new Set(input.cardsIds)]
            : undefined;

        const referencedCardIds = [
            ...(cardsIds ?? item.cardsIds),
            ...(input.artficeSettings?.cardDispachId
                ? [input.artficeSettings.cardDispachId]
                : []),
        ];
        if (referencedCardIds.length > 0) {
            await this.assertCardsBelongToUser(
                userId,
                [...new Set(referencedCardIds)],
            );
        }

        return this.repository.update(
            id,
            {
                ...input,
                cardsIds,
                slot: (input.isArtifice ?? item.isArtifice)
                    ? "inventory-only"
                    : input.slot,
                craftableWith: input.craftableWith as Prisma.InputJsonValue | undefined,
                artficeSettings: input.artficeSettings as Prisma.InputJsonValue | undefined,
                habilityCards: input.habilityCards as Prisma.InputJsonValue | undefined,
                vfxUrl: input.vfxUrl as Prisma.InputJsonValue | undefined,
            },
        );

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
