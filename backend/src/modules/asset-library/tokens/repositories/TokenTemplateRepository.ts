import { Prisma, type TokenInstance } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MapObjectMovementRepository } from "@/modules/map-objects/repositories/MapObjectMovementRepository";

export interface TokenInstanceDeletionResult {
    token: TokenInstance;
    endedBattle: {
        id: string;
        mapId: string;
        winnerTeam: string | null;
        winnerTokenIds: string[];
    } | null;
}

export class TokenTemplateRepository {
    private readonly mapObjectMovementRepository = new MapObjectMovementRepository();

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
        return this.mapObjectMovementRepository.moveInBattle(
            battleId,
            tokenId,
            to,
            otherUpdates,
        );
    }

    async delete(id: string) {
        return prisma.tokenInstance.delete({
            where: {
                id,
            },
        });
    }

    /**
     * Removes a board token without allowing an active battle to keep stale
     * references to it. An in-progress battle may only lose a token when that
     * leaves at most one team, in which case its state and pending queue are
     * deleted in the same transaction.
     */
    async deleteWithBattleSafety(id: string): Promise<TokenInstanceDeletionResult> {
        return prisma.$transaction(async (transaction) => {
            const token = await transaction.tokenInstance.findUnique({
                where: { id },
            });
            if (!token) {
                throw new Error("Instância de token não encontrada.");
            }

            const battle = await transaction.battleState.findFirst({
                where: { mapId: token.mapId },
            });
            const mapTokens = await transaction.tokenInstance.findMany({
                where: { mapId: token.mapId },
                select: { id: true, team: true, currentLife: true },
            });
            const remainingTokens = mapTokens.filter(
                (mapToken) => mapToken.id !== id,
            );
            const remainingTeams = new Set(
                remainingTokens.map((mapToken) => mapToken.team),
            );

            if (battle?.status === "In Battle" && remainingTeams.size > 1) {
                throw new Error(
                    "Não é possível remover um token durante uma batalha em andamento. Encerre a batalha antes de removê-lo.",
                );
            }

            await transaction.instanceTokenCard.deleteMany({
                where: { tokenId: id },
            });
            const deletedToken = await transaction.tokenInstance.delete({
                where: { id },
            });

            if (battle?.status !== "In Battle" || remainingTeams.size > 1) {
                return { token: deletedToken, endedBattle: null };
            }

            await transaction.battleState.delete({
                where: { id: battle.id },
            });
            await transaction.pendingQueue.delete({
                where: { id: battle.pendingQueueId },
            });

            const livingTeams = new Set(
                remainingTokens
                    .filter((mapToken) => mapToken.currentLife > 0)
                    .map((mapToken) => mapToken.team),
            );
            const winnerTeam = livingTeams.size === 1
                ? [...livingTeams][0]
                : null;

            return {
                token: deletedToken,
                endedBattle: {
                    id: battle.id,
                    mapId: battle.mapId,
                    winnerTeam,
                    winnerTokenIds: winnerTeam
                        ? remainingTokens
                            .filter((mapToken) => mapToken.team === winnerTeam)
                            .map((mapToken) => mapToken.id)
                        : [],
                },
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
}
