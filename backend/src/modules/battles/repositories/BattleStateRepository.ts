import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class BattleStateRepository {

    async create(data: any) {
        const { pendingQueueId, pendingQueue, ...rest } = data;

        try {
            // 1. Se já veio o objeto pendingQueue (ex: connect ou create)
            if (pendingQueue) {
                return await prisma.battleState.create({
                    data: {
                        ...rest,
                        pendingQueue,
                    },
                });
            }

            // 2. Se veio apenas a string pendingQueueId
            if (pendingQueueId) {
                return await prisma.battleState.create({
                    data: {
                        ...rest,
                        pendingQueue: {
                            connect: { id: pendingQueueId },
                        },
                    },
                });
            }

            // 3. Fallback: Se não veio nenhum dos dois, cria uma fila limpa atrelada à batalha
            return await prisma.battleState.create({
                data: {
                    ...rest,
                    pendingQueue: {
                        create: {},
                    },
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new Error("Já existe uma batalha neste mapa.");
            }

            throw error;
        }
    }

    async findById(id: string) {
        return prisma.battleState.findFirst({
            where: {
                id,
            }
        })
    }

    async findByMapId(mapId: string) {
        // Mantido como findFirst para continuar compatível enquanto a migration
        // que torna mapId único ainda não tiver sido aplicada/generada.
        return prisma.battleState.findFirst({
            where: {
                mapId,
            },
            orderBy: {
                updatedAt: "desc",
            },
        })
    }

    async update(id: string, data: Prisma.BattleStateUpdateInput) {
        return prisma.battleState.update({
            where: {
                id,
            },
            data
        })
    }

    /**
     * Reads and persists `activeMechanics` in a serializable transaction so a
     * mechanic update cannot overwrite another mechanic change made meanwhile.
     */
    async updateActiveMechanics(
        id: string,
        update: (activeMechanics: Prisma.JsonValue) => Prisma.InputJsonValue,
    ) {
        return prisma.$transaction(
            async (transaction) => {
                const battleState = await transaction.battleState.findUnique({
                    where: { id },
                    select: { activeMechanics: true },
                });

                if (!battleState) {
                    throw new Error(`Batalha com ID ${id} não foi encontrada.`);
                }

                return transaction.battleState.update({
                    where: { id },
                    data: {
                        activeMechanics: update(battleState.activeMechanics),
                    },
                });
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );
    }

    async delete(id: string) {
        return prisma.$transaction(async (transaction) => {
            const battle = await transaction.battleState.delete({
                where: {
                    id,
                },
            });

            await transaction.pendingQueue.delete({
                where: {
                    id: battle.pendingQueueId,
                },
            });

            return battle;
        });
    }

}
