import { prisma } from "@/lib/prisma";

export class CampaignRepository {

    async create(data: {
        name: string;
        description?: string;
        ownerId: string;
    }) {

        return prisma.campaign.create({
            data,
        });

    }

    async findManyByOwner(ownerId: string) {
        return prisma.campaign.findMany({
            where: {
                ownerId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async findCampaignById(id: string) {
        return prisma.campaign.findFirst({
            where: {
                id,
            },
            include: {
                members: {
                    select: {
                        userId: true,
                    },
                },
            },
        });
    }

    async update(
        id: string,
        data: {
            name?: string;
            description?: string;
        }
    ) {

        return prisma.campaign.update({
            where: {
                id,
            },
            data,
        });

    }

    async delete(id: string) {
        return prisma.campaign.delete({
            where: {
                id,
            }
        })
    }

}