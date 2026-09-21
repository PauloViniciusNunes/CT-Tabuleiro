import { NextRequest } from "next/server";

import { ItemController } from "../../controllers/ItemController";

const controller = new ItemController();

export async function POST(request: NextRequest) {
    return controller.create(request)
}