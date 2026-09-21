import { NextRequest, NextResponse } from "next/server";

import { CreateMapService } from "../services/CreateMapService";
import { GetMapByIdService } from "../services/GetMapByIdService";
import { GetMapsService } from "../services/GetMapsService";
import { DeleteMapService } from "../services/DeleteMapService";
import { UpdateMapService } from "../services/UpdateMapService";
import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class MapController {

    private readonly createMapService = new CreateMapService();
    private readonly getMapByIdService = new GetMapByIdService();
    private readonly getMapsService = new GetMapsService();
    private readonly deleteMapService = new DeleteMapService();
    private readonly updateMapService = new UpdateMapService();

    async create(
        request: NextRequest,
    ) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const map = await this.createMapService.execute(user.id, body)
            return NextResponse.json(map, {
                status: 200,
                headers: CORS_HEADERS
            })
        }
        catch (error) {
            console.error(error)
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro na criação",
                },
                { status: 400 }
            );
        }
    }

    async get(
        request: NextRequest,
        mapId: string
    ) {
        try {
            const user = await getUser(request);
            const map = await this.getMapByIdService.execute(user.id, mapId)
            return NextResponse.json(map, {
                status: 200,
                headers: CORS_HEADERS
            });
        } catch (error) {

            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro na captura",
                },
                { status: 401 }
            );
        }
    }

    async list(
        request: NextRequest,
        campaignId: string
    ) {

        try {
            const user = await getUser(request)
            const maps = await this.getMapsService.execute(user.id, campaignId)

            return NextResponse.json(maps, {
                status: 200,
                headers: CORS_HEADERS
            });
        }
        catch (error) {
            console.error(error)
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro na captura",
                },
                { status: 402 }
            );
        }

    }

    async delete(
        request: NextRequest,
        id: string
    ) {
        try {
            const user = await getUser(request);
            const body = await request.json()
            await this.deleteMapService.execute(id, user.id, body)
            return NextResponse.json({
                message: "Mapa encontrado e deletado com sucesso!"
            },
                {
                    status: 200,
                    headers: CORS_HEADERS
                })
        }
        catch (error) {

            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro no encerramento",
                },
                { status: 403 }
            );
        }
    }

    async update(
        request: NextRequest,
        campaignId: string,
        mapId: string,
    ) {
        try {
            const user = await getUser(request)
            const body = await request.json()



            const map = await this.updateMapService.execute(user.id, campaignId, mapId, body)
            return NextResponse.json(map)
        }
        catch (error) {
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro nas validações",
                },
                {
                    status: 200,
                    headers: CORS_HEADERS
                }
            );
        }
    }

}