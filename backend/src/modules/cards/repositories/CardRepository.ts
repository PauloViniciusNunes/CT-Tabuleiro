import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class CardRepository {

    async create(data: Prisma.CardCreateInput) {

        return prisma.card.create({
            data,
        });
    }

    async findManyByOwner(userId: string) {
        return prisma.card.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async getCardIdsByTokenId(tokenId: string): Promise<string[]> {
        const cards = await prisma.card.findMany({
            where: {
                tokens: {
                    some: {
                        id: tokenId,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        return cards.map(card => card.id);
    }

    async findCardById(id: string) {
        return prisma.card.findFirst({
            where: {
                id,
            },
        });
    }

    async findManyByIds(ids: string[]) {
        if (ids.length === 0) {
            return [];
        }

        return prisma.card.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
    }

    async update(
        id: string,
        data: Prisma.CardUpdateInput,
    ) {
        return prisma.card.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.card.delete({
            where: {
                id,
            },
        });
    }

}
