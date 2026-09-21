import { NextRequest } from "next/server";

import { TokenCardController } from "../../controllers/TokenCardController";

const controller = new TokenCardController()

export async function GET(request: NextRequest) {
    return controller.get(request)
}