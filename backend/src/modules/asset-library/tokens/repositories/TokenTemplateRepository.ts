import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertNaturalMovement } from "@/modules/engine/utils/naturalMovement";

export class TokenTemplateRepository {

    async create(data: Prisma.TokenInstanceCreateInput) {
        return prisma.tokenInstance.create({
            data,
        });
    }

    async list(userId: string) {
        return prisma.tokenInstance.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async listByMapId(mapId: string) {
        return prisma.tokenInstance.findMany({
            where: {
                mapId,
            }
        })
    }

    async findTokenTemplateById(id: string) {
        return prisma.tokenInstance.findUnique({
            where: {
                id,
            },
        });
    }

    async update(
        id: string,
        data: Prisma.TokenInstanceUpdateInput,
    ) {
        return prisma.tokenInstance.update({
            where: {
                id,
            },
            data,
        });
    }

    /** Removes exactly the occurrence selected by the player, rejecting stale clients. */
    async consumeCommonSlotItem(
        tokenId: string,
        itemId: string,
        itemIndex: number,
    ) {
        return prisma.$transaction(async (transaction) => {
            const token = await transaction.tokenInstance.findUnique({
                where: { id: tokenId },
            });

            if (!token) {
                throw new Error("Instância de token não encontrada.");
            }
            if (token.commonSlotIds[itemIndex] !== itemId) {
                throw new Error("O artifício não está mais no slot informado.");
            }

            return transaction.tokenInstance.update({
                where: { id: tokenId },
                data: {
                    commonSlotIds: token.commonSlotIds.filter(
                        (_, index) => index !== itemIndex,
                    ),
                },
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    /** Consumes the token's one movement for the current battle turn atomically. */
    async moveOnceInBattle(
        battleId: string,
        tokenId: string,
        to: { col: number; row: number },
        otherUpdates: Prisma.TokenInstanceUpdateInput = {},
    ) {
        return prisma.$transaction(async (transaction) => {
            const [battle, token] = await Promise.all([
                transaction.battleState.findUnique({ where: { id: battleId } }),
                transaction.tokenInstance.findUnique({ where: { id: tokenId } }),
            ]);
            if (!battle || battle.status !== "In Battle") {
                throw new Error("O movimento exige uma batalha em andamento.");
            }
            if (!token || token.mapId !== battle.mapId) {
                throw new Error("O token não pertence ao mapa da batalha.");
            }
            const from = { col: token.col, row: token.row };
            if (from.col === to.col && from.row === to.row) {
                return Object.keys(otherUpdates).length > 0
                    ? transaction.tokenInstance.update({
                        where: { id: tokenId },
                        data: otherUpdates,
                    })
                    : token;
            }
            if (battle.currentActorId !== tokenId) {
                throw new Error("Apenas o token do turno atual pode se mover.");
            }
            assertNaturalMovement(from, to, token.naturalMovement);

            const moved = battle.movedThisTurn && typeof battle.movedThisTurn === "object" &&
                !Array.isArray(battle.movedThisTurn)
                ? battle.movedThisTurn as Record<string, unknown>
                : {};
            if (moved[tokenId] === true) {
                throw new Error("O token já se moveu neste turno.");
            }

            await transaction.battleState.update({
                where: { id: battle.id },
                data: { movedThisTurn: { ...moved, [tokenId]: true } as Prisma.InputJsonValue },
            });
            return transaction.tokenInstance.update({
                where: { id: tokenId },
                data: { ...otherUpdates, col: to.col, row: to.row },
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    async delete(id: string) {
        return prisma.tokenInstance.delete({
            where: {
                id,
            },
        });
    }


}
