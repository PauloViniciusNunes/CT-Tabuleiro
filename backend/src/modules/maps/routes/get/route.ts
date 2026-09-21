import { NextRequest } from "next/server";

import { MapController } from "../../controllers/MapController";

const controller = new MapController();

export async function POST(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return controller.get(request, id)
}