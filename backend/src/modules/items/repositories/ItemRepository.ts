import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class ItemRepository {

    async create(data: Prisma.ItemCreateInput) {
        return prisma.item.create({
            data,
        });
    }

    async findManyByUser(userId: string) {
        return prisma.item.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async findItemById(id: string) {
        return prisma.item.findUnique({
            where: {
                id,
            },
        });
    }

    /** Deterministically resolves the first persisted item with this exact name. */
    async findFirstByName(name: string) {
        return prisma.item.findFirst({
            where: { name },
            orderBy: [
                { createdAt: "asc" },
                { id: "asc" },
            ],
        });
    }

    async findManyByIds(ids: string[]) {
        if (ids.length === 0) {
            return [];
        }

        return prisma.item.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
    }

    async update(
        id: string,
        data: Prisma.ItemUpdateInput,
    ) {
        return prisma.item.update({
            where: {
                id,
            },
            data,
        });
    }

    async disconnectToken(itemId: string, tokenId: string) {
        return prisma.item.update({
            where: {
                id: itemId,
            },
            data: {
                tokens: {
                    disconnect: {
                        id: tokenId,
                    },
                },
            },
        });
    }

    async delete(id: string) {
        return prisma.item.delete({
            where: {
                id,
            },
        });
    }

}
