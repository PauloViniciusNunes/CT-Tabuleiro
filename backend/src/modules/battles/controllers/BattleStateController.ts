import { NextRequest, NextResponse } from "next/server";

import { BattleStateCreateService } from "../services/state/BattleStateCreateService";
import { BattleStateGetService } from "../services/state/BattleStateGetService";
import { BattleStateUpdateService } from "../services/state/BattleStateUpdateService";
import { BattleStateDeleteService } from "../services/state/BattleStateDeleteService";
import { getUser } from "@/shared/utils/getUser";
import { BattleStateGetByMapIdService } from "../services/state/BattleStateGetByMapIdService";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class BattleStateController {
    private readonly battleStateCreateService = new BattleStateCreateService()
    private readonly battleStateGetService = new BattleStateGetService()
    private readonly battleStateUpdateService = new BattleStateUpdateService()
    private readonly battleStateDeleteService = new BattleStateDeleteService()
    private readonly battleStateGetByMapIdService = new BattleStateGetByMapIdService()

    async create(request: NextRequest) {
        try {

            const user = await getUser(request)
            const body = await request.json()
            const battle = await this.battleStateCreateService.execute(body.mapId, body)
            return NextResponse.json(battle, {
                status: 201,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            const message =
                error instanceof Error
                    ? error.message
                    : "Não foi possível criar a batalha.";

            return NextResponse.json(
                { message },
                {
                    status: message === "Já existe uma batalha neste mapa." ? 409 : 400,
                    headers: CORS_HEADERS,
                },
            );
        }
    }

    async get(id: string, request: NextRequest) {
        try {

            const user = await getUser(request)
            const battle = await this.battleStateGetService.execute(id)
            return NextResponse.json(battle, {
                status: 201,
                headers: CORS_HEADERS
            })
        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }

    async getByMapId(mapId: string, request: NextRequest) {
        try {
            const user = await getUser(request)
            const battle = await this.battleStateGetByMapIdService.execute(mapId)
            return NextResponse.json(battle, {
                status: 201,
                headers: CORS_HEADERS
            })
        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }

    async update(id: string, request: NextRequest) {
        try {

            const user = await getUser(request)
            const body = await request.json()
            const battle = await this.battleStateUpdateService.execute(id, body)
            return NextResponse.json(battle, {
                status: 201,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.log(error)
            return NextResponse.json(error, {
                status: 400
            })
        }
    }

    async delete(id: string, request: NextRequest) {
        try {
            const user = await getUser(request)
            await this.battleStateDeleteService.execute(id)
            return NextResponse.json({
                message: "Batalha deletada com sucesso.",
                status: 201,
                headers: CORS_HEADERS
            })
        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }

}
