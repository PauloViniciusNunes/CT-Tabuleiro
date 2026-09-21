import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class PendingQueueRepository {

    /* ================== CREATE ================== */

    async create(data: Prisma.PendingQueueCreateInput) {
        return prisma.pendingQueue.create({
            data,
        });
    }

    /* ================== REMOVE ================== */

    async delete(id: string) {
        return prisma.pendingQueue.delete({
            where: { id },
        });
    }

    async deleteByBattleStateId(battleStateId: string) {
        return prisma.pendingQueue.deleteMany({
            where: {
                battleState: {
                    id: battleStateId,
                },
            },
        });
    }

    /* ================== UPDATE ================== */

    async update(id: string, data: Prisma.PendingQueueUpdateInput) {
        return prisma.pendingQueue.update({
            where: { id },
            data,
        });
    }

    /* ================== FIND ================== */

    async findById(id: string) {
        return prisma.pendingQueue.findUnique({
            where: { id },
        });
    }

    async findByBattleStateId(battleStateId: string) {
        return prisma.pendingQueue.findFirst({
            where: {
                battleState: {
                    id: battleStateId,
                },
            },
        });
    }

    /* ================== LIST ================== */

    async findAll() {
        return prisma.pendingQueue.findMany();
    }
}