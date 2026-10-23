import { Prisma, type TokenInstance } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertNaturalMovement } from "@/modules/engine/utils/naturalMovement";
import { assertWallPathIsClear, type GridPoint } from "../utils/mapObjectPath";

export interface MapObjectMovementResult {
    readonly token: TokenInstance;
    readonly sourceMapId: string;
    readonly destinationMapId: string;
    readonly position: GridPoint;
    readonly collectedItemId: string | null;
    readonly consumedMapObjectId: string | null;
    readonly usedDoorId: string | null;
}

function assertPosition(position: GridPoint, cols: number, rows: number): void {
    if (
        !Number.isInteger(position.col) ||
        !Number.isInteger(position.row) ||
        position.col < 1 ||
        position.row < 1 ||
        position.col > cols ||
        position.row > rows
    ) {
        throw new Error("A posição de destino está fora dos limites do mapa.");
    }
}

/** Persists movement and MapObject side effects in one serializable transaction. */
export class MapObjectMovementRepository {
    async moveOutsideBattle(
        tokenId: string,
        to: GridPoint,
        otherUpdates: Prisma.TokenInstanceUpdateInput = {},
    ): Promise<MapObjectMovementResult> {
        return prisma.$transaction(async (transaction) => {
            const token = await transaction.tokenInstance.findUnique({ where: { id: tokenId } });
            if (!token) throw new Error("Instância de token não encontrada.");

            const activeBattle = await transaction.battleState.findFirst({
                where: { mapId: token.mapId, status: "In Battle" },
            });
            if (activeBattle) {
                throw new Error("Movimentos durante uma batalha devem usar a engine de movimento.");
            }

            return this.resolveMovement(transaction, token, to, otherUpdates, true);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    async moveInBattle(
        battleId: string,
        tokenId: string,
        to: GridPoint,
        otherUpdates: Prisma.TokenInstanceUpdateInput = {},
    ): Promise<MapObjectMovementResult> {
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
            if (battle.currentActorId !== tokenId) {
                throw new Error("Apenas o token do turno atual pode se mover.");
            }

            const from = { col: token.col, row: token.row };
            assertNaturalMovement(from, to, token.naturalMovement);
            const moved = battle.movedThisTurn && typeof battle.movedThisTurn === "object" &&
                !Array.isArray(battle.movedThisTurn)
                ? battle.movedThisTurn as Record<string, unknown>
                : {};
            if (moved[tokenId] === true && (from.col !== to.col || from.row !== to.row)) {
                throw new Error("O token já se moveu neste turno.");
            }

            const result = await this.resolveMovement(
                transaction,
                token,
                to,
                otherUpdates,
                false,
            );
            if (result.usedDoorId) {
                throw new Error("Portas não podem transferir tokens durante uma batalha.");
            }
            if (from.col !== to.col || from.row !== to.row) {
                await transaction.battleState.update({
                    where: { id: battle.id },
                    data: {
                        movedThisTurn: {
                            ...moved,
                            [tokenId]: true,
                        } as Prisma.InputJsonValue,
                    },
                });
            }
            return result;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    private async resolveMovement(
        transaction: Prisma.TransactionClient,
        token: TokenInstance,
        to: GridPoint,
        otherUpdates: Prisma.TokenInstanceUpdateInput,
        allowDoorTransfer: boolean,
    ): Promise<MapObjectMovementResult> {
        const sourceMap = await transaction.map.findUnique({ where: { id: token.mapId } });
        if (!sourceMap) throw new Error("Mapa do token não encontrado.");
        assertPosition(to, sourceMap.cols, sourceMap.rows);

        const sourceObjects = await transaction.mapObject.findMany({
            where: { mapId: sourceMap.id },
        });
        const from = { col: token.col, row: token.row };
        assertWallPathIsClear(from, to, sourceObjects);

        const targetObject = sourceObjects.find((object) =>
            object.col === to.col && object.row === to.row,
        );
        let destinationMapId = sourceMap.id;
        let destination = { ...to };
        let usedDoorId: string | null = null;

        if (targetObject?.type === "door") {
            if (!allowDoorTransfer) {
                throw new Error("Portas não podem transferir tokens durante uma batalha.");
            }
            if (
                !targetObject.linkedMapId ||
                targetObject.linkedMapId === sourceMap.id ||
                !targetObject.linkedDoorId
            ) {
                throw new Error("A porta não possui um destino válido.");
            }
            const [destinationMap, destinationDoor] = await Promise.all([
                transaction.map.findUnique({ where: { id: targetObject.linkedMapId } }),
                transaction.mapObject.findUnique({ where: { id: targetObject.linkedDoorId } }),
            ]);
            if (
                !destinationMap ||
                destinationMap.campaignId !== sourceMap.campaignId ||
                !destinationDoor ||
                destinationDoor.type !== "door" ||
                destinationDoor.mapId !== destinationMap.id
            ) {
                throw new Error("A porta correspondente não foi encontrada.");
            }
            destinationMapId = destinationMap.id;
            destination = { col: destinationDoor.col, row: destinationDoor.row };
            assertPosition(destination, destinationMap.cols, destinationMap.rows);
            usedDoorId = targetObject.id;
        }

        let collectedItemId: string | null = null;
        let consumedMapObjectId: string | null = null;
        let commonSlotIds = token.commonSlotIds;
        if (targetObject?.type === "chest" && targetObject.itemRelativeId) {
            const capacity = Math.max(
                0,
                token.inventoryDimensionsCols * token.inventoryDimensionsRows,
            );
            if (commonSlotIds.length < capacity) {
                const item = await transaction.item.findUnique({
                    where: { id: targetObject.itemRelativeId },
                });
                if (item) {
                    commonSlotIds = [...commonSlotIds, item.id];
                    collectedItemId = item.id;
                    consumedMapObjectId = targetObject.id;
                    await transaction.mapObject.delete({ where: { id: targetObject.id } });
                }
            }
        }

        const updatedToken = await transaction.tokenInstance.update({
            where: { id: token.id },
            data: {
                ...otherUpdates,
                map: { connect: { id: destinationMapId } },
                col: destination.col,
                row: destination.row,
                commonSlotIds,
            },
        });

        return {
            token: updatedToken,
            sourceMapId: sourceMap.id,
            destinationMapId,
            position: destination,
            collectedItemId,
            consumedMapObjectId,
            usedDoorId,
        };
    }
}
