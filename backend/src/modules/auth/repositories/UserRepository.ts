import { prisma } from "@/lib/prisma";

export class UserRepository {

    async create(data: {
        name: string;
        email: string;
        password: string;
    }) {
        return prisma.user.create({
            data,
        });
    }

    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    async list() {
        return prisma.user.findMany({})
    }

    async findById(id: string) {
        return prisma.user.findUnique({
            where: {
                id,
            },
        });
    }

    async userIdByTokenId(id: string) {
        return prisma.user.findFirst({
            where: {
                tokenInstances: {
                some: {
                    id,
                },
                },
            },
        });
    }

}