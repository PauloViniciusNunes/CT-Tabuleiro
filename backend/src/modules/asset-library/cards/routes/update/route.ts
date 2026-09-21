import { NextRequest } from "next/server";

import { TokenCardController } from "../../controllers/TokenCardController";

const controller = new TokenCardController()

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
    const {id} = await params
    return controller.update(request, id)
}