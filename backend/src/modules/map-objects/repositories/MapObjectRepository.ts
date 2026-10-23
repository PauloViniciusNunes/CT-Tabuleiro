import { Prisma, type MapObject } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
    CreateMapObjectInput,
    UpdateMapObjectInput,
} from "../validators/MapObjectValidator";

export interface MapObjectMutation {
    readonly mapObject: MapObject | null;
    readonly affectedMapIds: readonly string[];
}

function mirrorPosition(
    position: { row: number; col: number },
    destination: { rows: number; cols: number },
) {
    return {
        col: destination.cols + 1 - position.col,
        row: destination.rows + 1 - position.row,
    };
}

function assertInsideMap(
    value: { row: number; col: number },
    map: { rows: number; cols: number },
): void {
    if (
        value.row < 1 ||
        value.col < 1 ||
        value.row > map.rows ||
        value.col > map.cols
    ) {
        throw new Error("A posição do objeto está fora dos limites do mapa.");
    }
}

function isInsideMap(
    value: { row: number; col: number },
    map: { rows: number; cols: number },
): boolean {
    return value.row >= 1 && value.col >= 1 && value.row <= map.rows && value.col <= map.cols;
}

export class MapObjectRepository {
    async findById(id: string) {
        return prisma.mapObject.findUnique({ where: { id } });
    }

    async listByMapId(mapId: string) {
        return prisma.mapObject.findMany({
            where: { mapId },
            orderBy: [{ row: "asc" }, { col: "asc" }, { id: "asc" }],
        });
    }

    async create(mapId: string, input: CreateMapObjectInput): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const sourceMap = await transaction.map.findUnique({ where: { id: mapId } });
            if (!sourceMap) throw new Error("Mapa não encontrado.");
            const result = await this.createInTransaction(
                transaction,
                sourceMap,
                input,
                false,
            );
            return {
                mapObject: result?.mapObject ?? null,
                affectedMapIds: result?.affectedMapIds ?? [mapId],
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    /** Adds every newly painted cell atomically and ignores cells already occupied. */
    async paint(
        mapId: string,
        inputs: readonly CreateMapObjectInput[],
    ): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const sourceMap = await transaction.map.findUnique({ where: { id: mapId } });
            if (!sourceMap) throw new Error("Mapa não encontrado.");

            const affectedMapIds = new Set<string>([mapId]);
            let lastCreated: MapObject | null = null;
            for (const input of inputs) {
                const result = await this.createInTransaction(
                    transaction,
                    sourceMap,
                    input,
                    true,
                );
                if (!result) continue;
                lastCreated = result.mapObject;
                result.affectedMapIds.forEach((id) => affectedMapIds.add(id));
            }

            return {
                mapObject: lastCreated,
                affectedMapIds: [...affectedMapIds],
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    async update(
        mapId: string,
        objectId: string,
        input: UpdateMapObjectInput,
    ): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const current = await transaction.mapObject.findUnique({ where: { id: objectId } });
            if (!current || current.mapId !== mapId) {
                throw new Error("Objeto de mapa não encontrado.");
            }
            const sourceMap = await transaction.map.findUnique({ where: { id: mapId } });
            if (!sourceMap) throw new Error("Mapa não encontrado.");
            const merged: CreateMapObjectInput = {
                type: input.type ?? current.type,
                row: input.row ?? current.row,
                col: input.col ?? current.col,
                imgUrl: input.imgUrl ?? current.imgUrl,
                itemRelativeId: input.itemRelativeId === undefined
                    ? current.itemRelativeId
                    : input.itemRelativeId,
                linkedMapId: input.linkedMapId === undefined
                    ? current.linkedMapId
                    : input.linkedMapId,
            };
            assertInsideMap(merged, sourceMap);

            const oldPair = current.linkedDoorId
                ? await transaction.mapObject.findUnique({ where: { id: current.linkedDoorId } })
                : null;
            const affected = new Set([mapId]);
            if (oldPair) {
                affected.add(oldPair.mapId);
                await transaction.mapObject.delete({ where: { id: oldPair.id } });
            }
            await this.assertCellAvailable(transaction, mapId, merged, current.id);

            if (merged.type !== "door") {
                const updated = await transaction.mapObject.update({
                    where: { id: current.id },
                    data: {
                        type: merged.type,
                        row: merged.row,
                        col: merged.col,
                        imgUrl: merged.imgUrl,
                        itemRelativeId: merged.type === "chest"
                            ? merged.itemRelativeId ?? null
                            : null,
                        linkedMapId: null,
                        linkedDoorId: null,
                    },
                });
                return { mapObject: updated, affectedMapIds: [...affected] };
            }

            if (!merged.linkedMapId || merged.linkedMapId === mapId) {
                throw new Error("Escolha outro mapa como destino da porta.");
            }
            const destinationMap = await transaction.map.findUnique({
                where: { id: merged.linkedMapId },
            });
            if (!destinationMap || destinationMap.campaignId !== sourceMap.campaignId) {
                throw new Error("O destino da porta precisa pertencer à mesma campanha.");
            }
            const pairPosition = mirrorPosition(merged, destinationMap);
            assertInsideMap(pairPosition, destinationMap);
            await this.assertCellAvailable(transaction, destinationMap.id, pairPosition);
            const pairId = crypto.randomUUID();
            const updated = await transaction.mapObject.update({
                where: { id: current.id },
                data: {
                    type: "door",
                    row: merged.row,
                    col: merged.col,
                    imgUrl: merged.imgUrl,
                    itemRelativeId: null,
                    linkedMapId: destinationMap.id,
                    linkedDoorId: pairId,
                },
            });
            await transaction.mapObject.create({
                data: {
                    id: pairId,
                    type: "door",
                    ...pairPosition,
                    imgUrl: merged.imgUrl,
                    itemRelativeId: null,
                    mapId: destinationMap.id,
                    linkedMapId: mapId,
                    linkedDoorId: current.id,
                },
            });
            affected.add(destinationMap.id);
            return { mapObject: updated, affectedMapIds: [...affected] };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    async delete(mapId: string, objectId: string): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const current = await transaction.mapObject.findUnique({ where: { id: objectId } });
            if (!current || current.mapId !== mapId) {
                throw new Error("Objeto de mapa não encontrado.");
            }
            const affected = new Set([mapId]);
            if (current.linkedDoorId) {
                const pair = await transaction.mapObject.findUnique({
                    where: { id: current.linkedDoorId },
                });
                if (pair) {
                    affected.add(pair.mapId);
                    await transaction.mapObject.delete({ where: { id: pair.id } });
                }
            }
            await transaction.mapObject.delete({ where: { id: current.id } });
            return { mapObject: current, affectedMapIds: [...affected] };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    /** Clears a map and removes the counterpart of every linked door. */
    async clear(mapId: string): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const map = await transaction.map.findUnique({ where: { id: mapId } });
            if (!map) throw new Error("Mapa não encontrado.");

            const objects = await transaction.mapObject.findMany({
                where: { mapId },
                select: { linkedDoorId: true },
            });
            const linkedDoorIds = objects.flatMap((object) =>
                object.linkedDoorId ? [object.linkedDoorId] : [],
            );
            const externalDoorPairs = linkedDoorIds.length > 0
                ? await transaction.mapObject.findMany({
                    where: {
                        id: { in: linkedDoorIds },
                        mapId: { not: mapId },
                    },
                    select: { id: true, mapId: true },
                })
                : [];

            if (externalDoorPairs.length > 0) {
                await transaction.mapObject.deleteMany({
                    where: { id: { in: externalDoorPairs.map((door) => door.id) } },
                });
            }
            await transaction.mapObject.deleteMany({ where: { mapId } });

            return {
                mapObject: null,
                affectedMapIds: [
                    ...new Set([mapId, ...externalDoorPairs.map((door) => door.mapId)]),
                ],
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    /** Erases the painted cells and any external door counterparts atomically. */
    async erase(
        mapId: string,
        positions: readonly { row: number; col: number }[],
    ): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const map = await transaction.map.findUnique({ where: { id: mapId } });
            if (!map) throw new Error("Mapa não encontrado.");
            for (const position of positions) assertInsideMap(position, map);

            const uniquePositions = new Map(
                positions.map((position) => [`${position.col}:${position.row}`, position]),
            );
            const objects = await transaction.mapObject.findMany({
                where: {
                    mapId,
                    OR: [...uniquePositions.values()].map((position) => ({
                        row: position.row,
                        col: position.col,
                    })),
                },
                select: { id: true, linkedDoorId: true },
            });
            const linkedDoorIds = objects.flatMap((object) =>
                object.linkedDoorId ? [object.linkedDoorId] : [],
            );
            const externalDoorPairs = linkedDoorIds.length > 0
                ? await transaction.mapObject.findMany({
                    where: {
                        id: { in: linkedDoorIds },
                        mapId: { not: mapId },
                    },
                    select: { id: true, mapId: true },
                })
                : [];

            const idsToDelete = [
                ...objects.map((object) => object.id),
                ...externalDoorPairs.map((door) => door.id),
            ];
            if (idsToDelete.length > 0) {
                await transaction.mapObject.deleteMany({
                    where: { id: { in: idsToDelete } },
                });
            }

            return {
                mapObject: null,
                affectedMapIds: [
                    ...new Set([mapId, ...externalDoorPairs.map((door) => door.mapId)]),
                ],
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    /** Adds maze walls that do not already have a MapObject, preserving existing data. */
    async createWalls(
        mapId: string,
        walls: readonly { row: number; col: number; imgUrl: string }[],
    ): Promise<MapObjectMutation> {
        return prisma.$transaction(async (transaction) => {
            const map = await transaction.map.findUnique({ where: { id: mapId } });
            if (!map) throw new Error("Mapa não encontrado.");
            for (const wall of walls) assertInsideMap(wall, map);

            const existing = await transaction.mapObject.findMany({
                where: { mapId },
                select: { row: true, col: true },
            });
            const occupied = new Set(existing.map((object) => `${object.col}:${object.row}`));
            const newWalls = new Map<string, typeof walls[number]>();
            for (const wall of walls) {
                const key = `${wall.col}:${wall.row}`;
                if (!occupied.has(key)) newWalls.set(key, wall);
            }
            if (newWalls.size > 0) {
                await transaction.mapObject.createMany({
                    data: [...newWalls.values()].map((wall) => ({
                        ...wall,
                        type: "wall" as const,
                        mapId,
                    })),
                });
            }
            return { mapObject: null, affectedMapIds: [mapId] };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }

    private async assertCellAvailable(
        transaction: Prisma.TransactionClient,
        mapId: string,
        position: { row: number; col: number },
        excludedId?: string,
    ): Promise<void> {
        const occupied = await transaction.mapObject.findFirst({
            where: {
                mapId,
                row: position.row,
                col: position.col,
                ...(excludedId ? { id: { not: excludedId } } : {}),
            },
        });
        if (occupied) throw new Error("Já existe um objeto nesta célula.");
    }

    private async createInTransaction(
        transaction: Prisma.TransactionClient,
        sourceMap: { id: string; campaignId: string; rows: number; cols: number },
        input: CreateMapObjectInput,
        ignoreOccupied: boolean,
    ): Promise<{ mapObject: MapObject; affectedMapIds: string[] } | null> {
        assertInsideMap(input, sourceMap);
        const occupied = await transaction.mapObject.findFirst({
            where: { mapId: sourceMap.id, row: input.row, col: input.col },
        });
        if (occupied) {
            if (ignoreOccupied) return null;
            throw new Error("Já existe um objeto nesta célula.");
        }

        if (input.type !== "door") {
            const created = await transaction.mapObject.create({
                data: {
                    type: input.type,
                    row: input.row,
                    col: input.col,
                    imgUrl: input.imgUrl,
                    itemRelativeId: input.type === "chest"
                        ? input.itemRelativeId ?? null
                        : null,
                    mapId: sourceMap.id,
                    linkedMapId: null,
                    linkedDoorId: null,
                },
            });
            return { mapObject: created, affectedMapIds: [sourceMap.id] };
        }

        const destinationMapId = input.linkedMapId;
        if (!destinationMapId || destinationMapId === sourceMap.id) {
            throw new Error("Escolha outro mapa como destino da porta.");
        }
        const destinationMap = await transaction.map.findUnique({
            where: { id: destinationMapId },
        });
        if (!destinationMap || destinationMap.campaignId !== sourceMap.campaignId) {
            throw new Error("O destino da porta precisa pertencer à mesma campanha.");
        }
        const pairPosition = mirrorPosition(input, destinationMap);
        if (!isInsideMap(pairPosition, destinationMap)) {
            if (ignoreOccupied) return null;
            assertInsideMap(pairPosition, destinationMap);
        }
        const pairOccupied = await transaction.mapObject.findFirst({
            where: {
                mapId: destinationMap.id,
                row: pairPosition.row,
                col: pairPosition.col,
            },
        });
        if (pairOccupied) {
            if (ignoreOccupied) return null;
            throw new Error("Já existe um objeto na célula espelhada da porta.");
        }

        const primaryId = crypto.randomUUID();
        const pairId = crypto.randomUUID();
        const [primary] = await Promise.all([
            transaction.mapObject.create({
                data: {
                    id: primaryId,
                    type: "door",
                    row: input.row,
                    col: input.col,
                    imgUrl: input.imgUrl,
                    itemRelativeId: null,
                    mapId: sourceMap.id,
                    linkedMapId: destinationMap.id,
                    linkedDoorId: pairId,
                },
            }),
            transaction.mapObject.create({
                data: {
                    id: pairId,
                    type: "door",
                    ...pairPosition,
                    imgUrl: input.imgUrl,
                    itemRelativeId: null,
                    mapId: destinationMap.id,
                    linkedMapId: sourceMap.id,
                    linkedDoorId: primaryId,
                },
            }),
        ]);
        return {
            mapObject: primary,
            affectedMapIds: [sourceMap.id, destinationMap.id],
        };
    }
}
