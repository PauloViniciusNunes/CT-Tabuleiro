import { BattleStateController } from "@/modules/battles/controllers/BattleStateController";
import { NextRequest } from "next/server";

const controller = new BattleStateController()

export async function POST(request: NextRequest) {
    return controller.create(request)
}