import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class TokenCardRepository {

    async create(data: Prisma.InstanceTokenCardCreateInput) {
        return prisma.instanceTokenCard.create({ data, })
    }

    async createMany(
        tokenId: string,
        cardIds: string[],
    ) {
        return prisma.instanceTokenCard.createMany({
            data: cardIds.map((cardId) => ({
                tokenId,
                cardId,
            })),
        });
    }

    async list(tokenId: string) {
        return prisma.instanceTokenCard.findMany({
            where: {
                tokenId,
            },
            orderBy: {
                createdAt: "desc",
            }
        })
    }

    async find(id: string) {
        return prisma.instanceTokenCard.findFirst({
            where: {
                id,
            }
        })
    }

    async update(id: string, data: Prisma.InstanceTokenCardCreateInput) {
        return prisma.instanceTokenCard.update({
            where: {
                id,
            },
            data,
        })
    }

    async delete(id: string) {
        return prisma.instanceTokenCard.delete({
            where: {
                id,
            }
        })
    }

    async deleteByTokenId(tokenId: string) {
        return prisma.instanceTokenCard.deleteMany({
            where: {
                tokenId,
            }
        })
    }

}