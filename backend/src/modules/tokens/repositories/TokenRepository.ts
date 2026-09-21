import { prisma } from "@/lib/prisma";

import { CreateTokenDAO } from "../dao/CreateTokenDAO";
import { UpdateTokenDAO } from "../dao/UpdateTokenDAO";

export class TokenRepository {

    async create(
        data: CreateTokenDAO,
    ) {
        return prisma.token.create({
            data,
        });
    }

    async findManyByCampaign(campaignId: string) {
        return prisma.token.findMany({
            where: {
                campaignId,
            },
            orderBy: {
                createdAt: "desc",
            },            
        })
    }

    async findManyByUser(userId: string) {
        return prisma.token.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async findById(id: string) {
        return prisma.token.findFirst({
            where: {
                id,
            },
        });
    }

    async update(
        id: string,
        data: UpdateTokenDAO,
    ) {
        return prisma.token.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.token.delete({
            where: {
                id,
            },
        });
    }

}