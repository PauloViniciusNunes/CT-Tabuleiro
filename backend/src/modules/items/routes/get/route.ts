import { NextRequest } from "next/server";

import { ItemController } from "../../controllers/ItemController";

const controller = new ItemController();

export async function GET(request: NextRequest, { params }: {params: Promise<{ id: string }>}) {
    const {id} = await params;
    return controller.get(request, id)
}