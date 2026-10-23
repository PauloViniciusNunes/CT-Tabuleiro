import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";
import { MapObjectService } from "../services/MapObjectService";

export class MapObjectController {
    private readonly service = new MapObjectService();

    async list(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.list(user.id, mapId);
        });
    }

    async create(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.create(user.id, mapId, await request.json());
        }, 201);
    }

    async clear(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.clear(user.id, mapId);
        });
    }

    async update(request: NextRequest, mapId: string, objectId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.update(user.id, mapId, objectId, await request.json());
        });
    }

    async delete(request: NextRequest, mapId: string, objectId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.delete(user.id, mapId, objectId);
        });
    }

    async createWalls(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.createWalls(user.id, mapId, await request.json());
        }, 201);
    }

    async paint(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.paint(user.id, mapId, await request.json());
        }, 201);
    }

    async erase(request: NextRequest, mapId: string) {
        return this.handle(async () => {
            const user = await getUser(request);
            return this.service.erase(user.id, mapId, await request.json());
        });
    }

    private async handle(operation: () => Promise<unknown>, successStatus = 200) {
        try {
            return NextResponse.json(await operation(), {
                status: successStatus,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json({
                error: error instanceof Error
                    ? error.message
                    : "Não foi possível alterar o objeto do mapa.",
            }, { status: 400, headers: CORS_HEADERS });
        }
    }
}
