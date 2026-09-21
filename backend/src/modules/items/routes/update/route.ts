import { NextRequest } from "next/server";

import { ItemController } from "../../controllers/ItemController";

const controller = new ItemController();

export async function PATCH(request: NextRequest, { params } : {params: Promise<{id: string}>}) {
    const { id } = await params
    return controller.update(request, id)
}