import { NextRequest } from "next/server";
import { MapObjectController } from "../../controllers/MapObjectController";

const controller = new MapObjectController();

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.createWalls(request, (await params).id);
}
