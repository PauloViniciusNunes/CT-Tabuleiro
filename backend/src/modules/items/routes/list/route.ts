import { NextRequest } from "next/server";

import { ItemController } from "../../controllers/ItemController";

const controller = new ItemController();

export async function GET(request: NextRequest) {

    return controller.list(request)
}