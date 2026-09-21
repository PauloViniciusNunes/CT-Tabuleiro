import { BattleStateController } from "@/modules/battles/controllers/BattleStateController";
import { NextRequest } from "next/server";

const controller = new BattleStateController()

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
    const {id} = await params
    return controller.update(id, request)
}