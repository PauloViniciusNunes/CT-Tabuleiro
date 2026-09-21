import { NextRequest, NextResponse } from "next/server";

import { PendingQueueCreateService } from "../services/queue/PendingQueueCreateService";
import { PendingQueueDeleteService } from "../services/queue/PendingQueueDeleteService";
import { PendingQueueFindByBattleIdService } from "../services/queue/PendingQueueFindByBattleIdService";
import { PendingQueueUpdateService } from "../services/queue/PendingQueueUpdateService";

import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class PendingQueueController {
    private readonly pendingQueueCreateService = new PendingQueueCreateService()
    private readonly pendingQueueDeleteService = new PendingQueueDeleteService()
    private readonly pendingQueueFindByBattleIdService = new PendingQueueFindByBattleIdService()
    private readonly pendingQueueUpdateService = new PendingQueueUpdateService()

    async create(request: NextRequest, mapId: string) {
        try {
            
            const user = await getUser(request)
            const queue = await this.pendingQueueCreateService.execute(request)
            return NextResponse.json(queue, {
                status: 201,
                headers: CORS_HEADERS,
            })

        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }

    async delete(request: NextRequest, id: string) {
        try {
            const user = await getUser(request)
            const queue = await this.pendingQueueDeleteService.execute(id)
            return NextResponse.json({
                message: "Fila deletada com sucesso",
            }, {
                status: 201,
                headers: CORS_HEADERS,
            })
        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }
    
    async update(request: NextRequest, id: string) {
        try {
            const user = await getUser(request)
            const queue = await this.pendingQueueUpdateService.execute(request, id)
            return NextResponse.json(queue, {
                status: 201,
                headers: CORS_HEADERS,
            })
        } catch (error) {   
            return NextResponse.json(error, {
                status: 400
            })
        }
    }
    
    async find(battleId: string) {
        try {   
            const queue = await this.pendingQueueFindByBattleIdService.execute(battleId)
            return NextResponse.json(queue, {
                status: 201,
                headers: CORS_HEADERS,
            })
        } catch (error) {
            return NextResponse.json(error, {
                status: 400
            })
        }
    }    

}
