import { prisma } from "@/lib/prisma";

export class MapRepository {

    async create(data: {
        name: string;
        description?: string;
        campaignId: string;
        rows?: number;
        cols?: number;
    }) {

        return prisma.map.create({
            data,
        });

    }

    async findManyByCampaign(campaignId: string) {

        return prisma.map.findMany({

            where: {
                campaignId,
            },

            orderBy: {
                createdAt: "desc",
            },
            include: {
                boardTokens: true,
                mapObjs: true
            }

        });

    }

    async findMapById(id: string) {

        return prisma.map.findFirst({

            where: {
                id,
            },
            include: {
                boardTokens: true,
                mapObjs: true
            }            

        });

    }

    async update(

        id: string,

        data: {
            name?: string;
            description?: string;
            rows?: number;
            cols?: number;
        },

    ) {

        return prisma.map.update({

            where: {
                id,
            },

            data,

        });

    }

    async delete(id: string) {

        return prisma.map.delete({

            where: {
                id,
            },

        });

    }

}