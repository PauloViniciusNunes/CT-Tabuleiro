import { NextRequest } from "next/server";

import { MapController } from "../../controllers/MapController";

const controller = new MapController();

export async function POST(request: NextRequest) {
    return controller.create(request)
}