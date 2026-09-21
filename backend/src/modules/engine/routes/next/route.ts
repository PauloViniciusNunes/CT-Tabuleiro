import { NextRequest } from "next/server";

import { BattleEngineController } from "../../controller/BattleEngineController";

const controller = new BattleEngineController()

export async function POST(request: NextRequest) {
    return controller.next(request)
}