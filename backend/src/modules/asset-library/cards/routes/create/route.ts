import { NextRequest } from "next/server";

import { TokenCardController } from "../../controllers/TokenCardController";

const controller = new TokenCardController()

export async function POST(request: NextRequest) {
    return controller.create(request)
}