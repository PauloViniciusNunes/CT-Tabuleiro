import { NextRequest } from "next/server";
import { BattleEngineController } from "../../controller/BattleEngineController";

const controller = new BattleEngineController()

export async function GET(request: NextRequest, {params} : {params: Promise<{id: string}>}) {
    const {id} = await params
    return controller.start(id, request)
}